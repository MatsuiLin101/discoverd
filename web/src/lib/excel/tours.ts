/**
 * Tour import/export. Identity is the frozen productId only (never name):
 *   - productId present & found  -> update that tour
 *   - productId present & absent -> create new (mint a fresh productId)
 *   - productId blank            -> create new (mint a fresh productId)
 *
 * Rows without a productId additionally get a soft "possible duplicate" warning
 * when a (region, sub, name) combo already exists in the DB or earlier in the
 * file — the user decides whether to import them anyway (they still create new).
 *
 * Regions / sub-regions / tags referenced by name are auto-created. The daily
 * productId sequence caps at 99 per (region, sub); rows over the cap are skipped
 * at commit with a message.
 */
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import {
  readAllSheetRows,
  buildWorkbook,
  buildMultiSheetWorkbook,
  sanitizeSheetName,
  type SheetRow,
  type WorkbookSheet,
} from "./xlsx";
import type { Prisma } from "@/generated/prisma/client";
import { parseTags, parsePrice, parsePublished, formatPublished } from "./normalize";
import { allocateTourProductId, DailyQuotaError, nextRegionCode, nextSubCode } from "./product-id";
import type { ImportPreview, PreviewRowDisplay, RowIssue } from "./import-core";

export const TOUR_SHEET = "旅遊方案";
// Export groups tours into one worksheet per region (named `{code}{name}`);
// import reads every worksheet. SEO columns are intentionally excluded.
export const TOUR_HEADERS = [
  "ProductID",
  "主分類",
  "次分類",
  "標籤",
  "行程名稱",
  "價格",
  "行程簡介",
  "發布(Y/N)",
];

export interface TourOpRow {
  row: number;
  sheet?: string;
  action: "create" | "update";
  productId: string | null; // update: existing id; create: null
  regionName: string;
  subName: string;
  name: string;
  price: number;
  tags: string[];
  description: string | null;
  published: boolean;
}

export interface TourImportPayload {
  rows: TourOpRow[];
}

function col(sr: SheetRow, i: number): string {
  return (sr.cells[i] ?? "").trim();
}

/** Analyse rows against the DB to produce a preview + a valid-row payload. */
export async function analyzeTours(
  rows: SheetRow[],
): Promise<{ preview: ImportPreview; payload: TourImportPayload }> {
  const display: PreviewRowDisplay[] = [];
  const errors: RowIssue[] = [];
  const duplicates: RowIssue[] = [];
  const valid: TourOpRow[] = [];

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Collect productIds present in the file to resolve existing tours in one query.
  const providedIds = new Set<string>();
  for (const sr of rows) {
    if (sr.rowNumber === 1) continue;
    const pid = col(sr, 0);
    if (pid) providedIds.add(pid);
  }
  const existingById = new Map<string, { name: string }>();
  if (providedIds.size > 0) {
    const found = await db.tour.findMany({
      where: { productId: { in: [...providedIds] } },
      select: { productId: true, name: true },
    });
    for (const t of found) existingById.set(t.productId!, { name: t.name });
  }

  // Existing (region|sub|name) combos for the duplicate warning.
  const combos = new Set<string>();
  const allTours = await db.tour.findMany({
    select: { name: true, subRegion: { select: { name: true, region: { select: { name: true } } } } },
  });
  for (const t of allTours) {
    combos.add(`${t.subRegion.region.name}|${t.subRegion.name}|${t.name}`);
  }

  const seenIds = new Set<string>();
  const fileCombos = new Set<string>();

  for (const sr of rows) {
    if (sr.rowNumber === 1) continue; // header (per worksheet)
    const sheet = sr.sheetName;
    const productId = col(sr, 0);
    const regionName = col(sr, 1);
    const subName = col(sr, 2);
    const tagsRaw = col(sr, 3);
    const name = col(sr, 4);
    const priceRaw = col(sr, 5);
    const description = sr.cells[6] ?? ""; // keep newlines/spaces
    const publishedRaw = col(sr, 7);

    if (!productId && !regionName && !subName && !name && !priceRaw) continue; // blank row

    // Validation
    if (!name) {
      errors.push({ row: sr.rowNumber, sheet, message: "缺少行程名稱" });
      continue;
    }
    if (!regionName || !subName) {
      errors.push({ row: sr.rowNumber, sheet, message: "缺少主分類或次分類" });
      continue;
    }
    const price = parsePrice(priceRaw);
    if (price === null) {
      errors.push({ row: sr.rowNumber, sheet, message: `價格無法解析：「${priceRaw}」` });
      continue;
    }

    const base = {
      row: sr.rowNumber,
      sheet,
      regionName,
      subName,
      name,
      price,
      tags: parseTags(tagsRaw),
      description: description.length > 0 ? description : null,
      published: parsePublished(publishedRaw),
    };
    // Per-column values shown in the rich preview table.
    const values: Record<string, string> = {
      subName,
      tags: base.tags.join("、"),
      name,
      price: String(price),
      published: base.published ? "Y" : "N",
    };

    if (productId) {
      if (seenIds.has(productId)) {
        duplicates.push({ row: sr.rowNumber, sheet, message: `檔案內重複的 ProductID「${productId}」，已略過` });
        display.push({ row: sr.rowNumber, sheet, action: "skip", label: name, detail: `ProductID ${productId} 重複`, duplicate: true, values });
        skippedCount++;
        continue;
      }
      seenIds.add(productId);
      const existing = existingById.get(productId);
      if (existing) {
        updatedCount++;
        display.push({ row: sr.rowNumber, sheet, action: "update", label: name, detail: `ProductID ${productId}`, values });
        valid.push({ ...base, action: "update", productId });
      } else {
        createdCount++;
        display.push({ row: sr.rowNumber, sheet, action: "create", label: name, detail: `填入的編號 ${productId} 不存在，將配發新編號`, values });
        valid.push({ ...base, action: "create", productId: null });
      }
    } else {
      // No productId -> new tour, with a possible-duplicate warning.
      const combo = `${regionName}|${subName}|${name}`;
      const isDup = combos.has(combo) || fileCombos.has(combo);
      fileCombos.add(combo);
      createdCount++;
      display.push({
        row: sr.rowNumber,
        sheet,
        action: "create",
        label: name,
        detail: isDup ? "疑似重複（將建立為新行程）" : "新行程",
        duplicate: isDup,
        values,
      });
      if (isDup) {
        duplicates.push({ row: sr.rowNumber, sheet, message: `已存在相同「主分類/次分類/行程名稱」：${regionName} / ${subName} / ${name}` });
      }
      valid.push({ ...base, action: "create", productId: null });
    }
  }

  const preview: ImportPreview = {
    rows: display,
    columns: [
      { key: "subName", label: "次分類" },
      { key: "tags", label: "標籤" },
      { key: "name", label: "行程名稱" },
      { key: "price", label: "價格" },
      { key: "published", label: "發布" },
    ],
    createdCount,
    updatedCount,
    skippedCount,
    errors,
    duplicates,
  };
  return { preview, payload: { rows: valid } };
}

function randSlug() {
  return randomBytes(4).toString("hex");
}
async function uniqueTourSlug(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = randSlug();
    if (!(await tx.tour.findUnique({ where: { slug } }))) return slug;
  }
  throw new Error("無法產生唯一的行程 slug");
}

/**
 * Match an existing region/sub/tag whose stored name only differs from `name`
 * by surrounding whitespace. Used as a fallback after an exact lookup misses so
 * legacy dirty rows are reused rather than duplicated. `name` is already trimmed.
 */
async function findRegionByTrimmedName(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<{ id: string } | null> {
  const all = await tx.region.findMany({ select: { id: true, name: true } });
  const match = all.find((r) => r.name.trim() === name);
  return match ? { id: match.id } : null;
}

async function findSubByTrimmedName(
  tx: Prisma.TransactionClient,
  regionId: string,
  name: string,
): Promise<{ id: string } | null> {
  const all = await tx.subRegion.findMany({ where: { regionId }, select: { id: true, name: true } });
  const match = all.find((s) => s.name.trim() === name);
  return match ? { id: match.id } : null;
}

async function findTagByTrimmedName(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<{ id: string } | null> {
  const all = await tx.tag.findMany({ select: { id: true, name: true } });
  const match = all.find((t) => t.name.trim() === name);
  return match ? { id: match.id } : null;
}

/** Resolve (creating if needed) the subRegion id for a (regionName, subName). */
async function ensureRegionSub(
  tx: Prisma.TransactionClient,
  regionName: string,
  subName: string,
  regionCache: Map<string, string>,
  subCache: Map<string, string>,
): Promise<string> {
  let regionId = regionCache.get(regionName);
  if (!regionId) {
    // Exact match first; fall back to a whitespace-trimmed match so legacy dirty
    // names (e.g. "日本 ") are reused instead of spawning a duplicate region.
    const existing =
      (await tx.region.findUnique({ where: { name: regionName }, select: { id: true } })) ??
      (await findRegionByTrimmedName(tx, regionName));
    if (existing) {
      regionId = existing.id;
    } else {
      const code = await nextRegionCode(tx);
      const slug = randSlug();
      const max = await tx.region.aggregate({ _max: { sortOrder: true } });
      const created = await tx.region.create({
        data: { name: regionName, slug, code, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      });
      regionId = created.id;
    }
    regionCache.set(regionName, regionId);
  }
  const subKey = `${regionId}|${subName}`;
  let subId = subCache.get(subKey);
  if (!subId) {
    const existing =
      (await tx.subRegion.findFirst({ where: { regionId, name: subName }, select: { id: true } })) ??
      (await findSubByTrimmedName(tx, regionId, subName));
    if (existing) {
      subId = existing.id;
    } else {
      const code = await nextSubCode(tx, regionId);
      const slug = randSlug();
      const max = await tx.subRegion.aggregate({ where: { regionId }, _max: { sortOrder: true } });
      const created = await tx.subRegion.create({
        data: { regionId, name: subName, slug, code, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      });
      subId = created.id;
    }
    subCache.set(subKey, subId);
  }
  return subId;
}

async function ensureTag(
  tx: Prisma.TransactionClient,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;
  const existing =
    (await tx.tag.findUnique({ where: { name }, select: { id: true } })) ??
    (await findTagByTrimmedName(tx, name));
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }
  const max = await tx.tag.aggregate({ _max: { sortOrder: true } });
  const created = await tx.tag.create({ data: { name, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  cache.set(name, created.id);
  return created.id;
}

/** Apply valid rows; returns actual counts plus any quota-skipped rows. */
export async function commitTours(rows: TourOpRow[]): Promise<{
  createdCount: number;
  updatedCount: number;
  quotaSkipped: RowIssue[];
}> {
  return db.$transaction(
    async (tx) => {
      const regionCache = new Map<string, string>();
      const subCache = new Map<string, string>();
      const tagCache = new Map<string, string>();
      let created = 0;
      let updated = 0;
      const quotaSkipped: RowIssue[] = [];

      for (const r of rows) {
        const subRegionId = await ensureRegionSub(tx, r.regionName, r.subName, regionCache, subCache);
        const tagIds: string[] = [];
        for (const t of r.tags) tagIds.push(await ensureTag(tx, t, tagCache));

        // Existing tour to update?
        let existing = null as null | { id: string };
        if (r.action === "update" && r.productId) {
          existing = await tx.tour.findUnique({ where: { productId: r.productId }, select: { id: true } });
        }

        if (existing) {
          // SEO is not in the tour sheet, so it is preserved (not overwritten).
          await tx.tour.update({
            where: { id: existing.id },
            data: {
              name: r.name,
              price: r.price,
              description: r.description,
              published: r.published,
              subRegionId,
              tags: { set: tagIds.map((id) => ({ id })) },
            },
          });
          updated++;
          continue;
        }

        // Create (mint a fresh productId).
        let productId: string;
        try {
          productId = await allocateTourProductId(tx, subRegionId);
        } catch (e) {
          if (e instanceof DailyQuotaError) {
            quotaSkipped.push({ row: r.row, message: e.message });
            continue;
          }
          throw e;
        }
        const slug = await uniqueTourSlug(tx);
        const max = await tx.tour.aggregate({ where: { subRegionId }, _max: { sortOrder: true } });
        await tx.tour.create({
          data: {
            name: r.name,
            slug,
            productId,
            price: r.price,
            description: r.description,
            subRegionId,
            published: r.published,
            sortOrder: (max._max.sortOrder ?? -1) + 1,
            tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
          },
        });
        created++;
      }

      return { createdCount: created, updatedCount: updated, quotaSkipped };
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}

export async function buildTourExport(regionIds?: string[]): Promise<Buffer> {
  // One worksheet per region, ordered by region code (101, 102, …); rows within
  // a sheet sorted by ProductID. An optional regionIds filter exports only those
  // regions (omitted / empty = all).
  const regions = await db.region.findMany({
    where: regionIds && regionIds.length ? { id: { in: regionIds } } : undefined,
    include: {
      subRegions: {
        include: { tours: { include: { tags: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } } },
      },
    },
  });
  const codeNum = (c: string | null) => (c ? parseInt(c, 10) : Number.MAX_SAFE_INTEGER);
  regions.sort((a, b) => codeNum(a.code) - codeNum(b.code));

  const sheets: WorkbookSheet[] = regions.map((region) => {
    const tours = region.subRegions.flatMap((sub) =>
      sub.tours.map((t) => ({ sub, t })),
    );
    tours.sort((a, b) => (a.t.productId ?? "").localeCompare(b.t.productId ?? ""));
    const rows = tours.map(({ sub, t }) => [
      t.productId ?? "",
      region.name,
      sub.name,
      t.tags.map((tag) => tag.name).join(","),
      t.name,
      t.price,
      t.description ?? "",
      formatPublished(t.published),
    ]);
    return {
      name: sanitizeSheetName(`${region.code ?? ""}${region.name}`),
      headers: TOUR_HEADERS,
      rows,
    };
  });
  return buildMultiSheetWorkbook(sheets);
}

export async function buildTourTemplate(): Promise<Buffer> {
  return buildWorkbook(TOUR_SHEET, TOUR_HEADERS, [
    ["", "範例主分類", "範例次分類", "標籤一,標籤二", "範例行程 5 日", 12888, "行程簡介，可換行。", "Y"],
    ["", "範例主分類", "範例次分類", "標籤一", "範例行程 3 日", 8999, "簡短簡介", "N"],
  ]);
}

export async function readTourRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  return readAllSheetRows(buf);
}
