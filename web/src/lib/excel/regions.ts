/**
 * Region + SubRegion (two-level) import/export in a single sheet.
 *
 * Columns: 主分類代碼 | 主分類名稱 | 主分類網址 | 次分類代碼 | 次分類名稱 | 次分類網址 | SEO標題 | SEO描述
 *   - Each row optionally defines a subRegion under a region.
 *   - A row with the subRegion columns blank defines only the region.
 *   - SEO columns apply to the subRegion when present, otherwise to the region.
 *   - Slug columns are the URL segments (/regions/[slug]/[subSlug]), sitting to
 *     the right of the name they belong to.
 *     - Blank on a new entity  -> derived from the name, else a random slug.
 *     - Blank on an existing entity -> left unchanged.
 *     - Present -> validated (lowercase a-z0-9-, unique) and applied.
 *     - 主分類網址 is applied on the region's first appearing row (whether or
 *       not that row also carries a subRegion), so regions that only ever
 *       appear with subRegions remain editable.
 *   - Columns are matched by their header name, so column order is flexible and
 *     a legacy 6-column file (no slug columns) still imports correctly. Files
 *     with no recognizable header fall back to the REGION_HEADERS order.
 *
 * Identity (mirrors the frozen-code philosophy):
 *   - code present & found  -> that entity (may be updated)
 *   - code present & absent -> treated as new (a fresh code is minted)
 *   - code blank            -> match by name within scope; else create
 * Codes are minted at commit via lib/excel/product-id helpers.
 */
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { readFirstSheetRows, buildWorkbook, type SheetRow } from "./xlsx";
import type { Prisma } from "@/generated/prisma/client";
import { nextRegionCode, nextSubCode } from "./product-id";
import { slugify, isValidSlug } from "@/lib/slug";
import type { ImportPreview, PreviewRowDisplay, RowIssue } from "./import-core";

export const REGION_SHEET = "地區";
export const REGION_HEADERS = [
  "主分類代碼",
  "主分類名稱",
  "主分類網址",
  "次分類代碼",
  "次分類名稱",
  "次分類網址",
  "SEO標題",
  "SEO描述",
];

export interface RegionRow {
  row: number;
  regionCode: string;
  regionName: string;
  subCode: string;
  subName: string;
  seoTitle: string;
  seoDescription: string;
  regionSlug: string;
  subSlug: string;
}

export interface RegionImportPayload {
  rows: RegionRow[];
}

/**
 * Map each known header label to its column index in the uploaded file. Columns
 * are matched by name so their order is flexible and legacy files (missing the
 * slug columns) still parse. When the header row has no recognizable label we
 * fall back to the canonical REGION_HEADERS order.
 */
type ColIndex = Record<string, number>;
function buildColIndex(headerRow: SheetRow | undefined): ColIndex {
  const cells = (headerRow?.cells ?? []).map((c) => (c ?? "").trim());
  const hasHeader = cells.includes("主分類名稱");
  const col: ColIndex = {};
  REGION_HEADERS.forEach((label, defaultIdx) => {
    const found = hasHeader ? cells.indexOf(label) : defaultIdx;
    col[label] = found; // -1 when a header is present but this column is absent
  });
  return col;
}

function parseRow(sr: SheetRow, col: ColIndex): RegionRow {
  const c = (label: string) => {
    const i = col[label];
    return i === undefined || i < 0 ? "" : (sr.cells[i] ?? "").trim();
  };
  return {
    row: sr.rowNumber,
    regionCode: c("主分類代碼"),
    regionName: c("主分類名稱"),
    subCode: c("次分類代碼"),
    subName: c("次分類名稱"),
    seoTitle: c("SEO標題"),
    seoDescription: c("SEO描述"),
    regionSlug: c("主分類網址"),
    subSlug: c("次分類網址"),
  };
}

interface RegionInfo {
  id: string;
  name: string;
  code: string | null;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
}
interface SubInfo {
  id: string;
  regionId: string;
  name: string;
  code: string | null;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Analyse rows against the current DB to produce a preview + a valid-row payload. */
export async function analyzeRegions(
  rows: SheetRow[],
): Promise<{ preview: ImportPreview; payload: RegionImportPayload }> {
  const regions = await db.region.findMany({
    select: { id: true, name: true, code: true, slug: true, seoTitle: true, seoDescription: true },
  });
  const subs = await db.subRegion.findMany({
    select: { id: true, regionId: true, name: true, code: true, slug: true, seoTitle: true, seoDescription: true },
  });

  const regionByCode = new Map<string, RegionInfo>();
  const regionByName = new Map<string, RegionInfo>();
  const regionBySlug = new Map<string, RegionInfo>();
  for (const r of regions) {
    if (r.code) regionByCode.set(r.code, r);
    regionByName.set(r.name, r);
    regionBySlug.set(r.slug, r);
  }
  const subsByRegion = new Map<string, SubInfo[]>();
  for (const s of subs) {
    const arr = subsByRegion.get(s.regionId) ?? [];
    arr.push(s);
    subsByRegion.set(s.regionId, arr);
  }

  const display: PreviewRowDisplay[] = [];
  const errors: RowIssue[] = [];
  const duplicates: RowIssue[] = [];
  const valid: RegionRow[] = [];

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Track regions the file introduces so a later sub row sees them as "known".
  const newRegionKeys = new Set<string>(); // key by name
  const seenRegionOnly = new Set<string>();
  const seenSubKeys = new Set<string>();

  // Track slugs claimed within this file to catch in-file conflicts.
  const reservedRegionSlugs = new Map<string, string>(); // slug -> owning regionKey
  const reservedSubSlugs = new Map<string, string>(); // `${regionKey}|${slug}` -> owning subKey
  // Regions whose slug change we've already surfaced (applied once, on the
  // region's first appearing row — even when that row carries a subRegion).
  const regionSlugChangeShown = new Set<string>();

  const col = buildColIndex(rows.find((r) => r.rowNumber === 1));

  for (const sr of rows) {
    if (sr.rowNumber === 1) continue; // header
    const r = parseRow(sr, col);
    if (!r.regionCode && !r.regionName && !r.subCode && !r.subName && !r.seoTitle && !r.seoDescription) {
      continue; // blank row
    }

    // Resolve region.
    let region: RegionInfo | undefined;
    let regionIsNew = false;
    if (r.regionCode) {
      region = regionByCode.get(r.regionCode);
      if (!region) regionIsNew = true; // code not found -> new (fresh code minted later)
    } else if (r.regionName) {
      region = regionByName.get(r.regionName);
      if (!region) regionIsNew = true;
    } else {
      errors.push({ row: r.row, message: "缺少主分類（代碼或名稱擇一）" });
      continue;
    }

    const regionKey = region ? `id:${region.id}` : `name:${r.regionName}`;
    if (regionIsNew && !r.regionName) {
      errors.push({ row: r.row, message: "要新增主分類但缺少主分類名稱" });
      continue;
    }

    // Validate the region slug (applied at commit on the region's first row).
    if (r.regionSlug) {
      if (!isValidSlug(r.regionSlug)) {
        errors.push({ row: r.row, message: `主分類網址「${r.regionSlug}」格式錯誤（僅允許小寫英文、數字、連字號）` });
        continue;
      }
      const slugOwner = regionBySlug.get(r.regionSlug);
      if (slugOwner && (!region || slugOwner.id !== region.id)) {
        errors.push({ row: r.row, message: `主分類網址「${r.regionSlug}」已被其他主分類使用` });
        continue;
      }
      const reservedBy = reservedRegionSlugs.get(r.regionSlug);
      if (reservedBy && reservedBy !== regionKey) {
        errors.push({ row: r.row, message: `主分類網址「${r.regionSlug}」在檔案內被多個主分類使用` });
        continue;
      }
      reservedRegionSlugs.set(r.regionSlug, regionKey);
    }

    // Count a new region once (whether introduced by a region-only or a sub row).
    if (regionIsNew && !newRegionKeys.has(regionKey)) {
      newRegionKeys.add(regionKey);
      createdCount++;
    }

    const hasSub = !!(r.subCode || r.subName);

    // Per-column values shown in the rich preview table (echo the file input).
    const values: Record<string, string> = {
      regionName: r.regionName || region?.name || "",
      regionSlug: r.regionSlug,
      subName: r.subName,
      subSlug: r.subSlug,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
    };

    // Does this row change the (existing) region's slug? It is applied once, on
    // the region's first appearing row, so surface it even on a subRegion row.
    let regionSlugChangeHere = false;
    if (region && !regionIsNew && r.regionSlug && r.regionSlug !== region.slug && !regionSlugChangeShown.has(regionKey)) {
      regionSlugChangeShown.add(regionKey);
      regionSlugChangeHere = true;
    }

    // Only rows that actually create/update something enter the commit payload.
    let willApply = false;

    if (hasSub) {
      const existingSubs = region ? subsByRegion.get(region.id) ?? [] : [];
      let sub: SubInfo | undefined;
      if (!regionIsNew) {
        if (r.subCode) sub = existingSubs.find((s) => s.code === r.subCode);
        else sub = existingSubs.find((s) => s.name === r.subName);
      }
      const subKey = `${regionKey}|${r.subCode ? `c:${r.subCode}` : `n:${r.subName}`}`;
      if (seenSubKeys.has(subKey)) {
        duplicates.push({ row: r.row, message: `檔案內重複的次分類（${r.regionName || region?.name} / ${r.subName}），已略過` });
        display.push({ row: r.row, action: "skip", label: `${r.regionName || region?.name} / ${r.subName}`, detail: "檔案內重複", duplicate: true, values });
        skippedCount++;
        continue;
      }
      seenSubKeys.add(subKey);

      // Validate the sub slug (unique within its parent region).
      if (r.subSlug) {
        if (!isValidSlug(r.subSlug)) {
          errors.push({ row: r.row, message: `次分類網址「${r.subSlug}」格式錯誤（僅允許小寫英文、數字、連字號）` });
          continue;
        }
        if (region) {
          const slugOwner = (subsByRegion.get(region.id) ?? []).find((s) => s.slug === r.subSlug);
          if (slugOwner && (!sub || slugOwner.id !== sub.id)) {
            errors.push({ row: r.row, message: `次分類網址「${r.subSlug}」在此主分類下已被使用` });
            continue;
          }
        }
        const reservedKey = `${regionKey}|${r.subSlug}`;
        const reservedBy = reservedSubSlugs.get(reservedKey);
        if (reservedBy && reservedBy !== subKey) {
          errors.push({ row: r.row, message: `次分類網址「${r.subSlug}」在同一主分類下於檔案內重複` });
          continue;
        }
        reservedSubSlugs.set(reservedKey, subKey);
      }

      if (sub) {
        const subChanged =
          (!!r.subName && r.subName !== sub.name) ||
          (!!r.subSlug && r.subSlug !== sub.slug) ||
          r.seoTitle !== (sub.seoTitle ?? "") ||
          r.seoDescription !== (sub.seoDescription ?? "");
        if (subChanged || regionSlugChangeHere) {
          updatedCount++;
          willApply = true;
          const bits: string[] = [];
          if (sub.code) bits.push(`代碼 ${region!.code}${sub.code}`);
          if (regionSlugChangeHere) bits.push(`主分類網址 → ${r.regionSlug}`);
          display.push({ row: r.row, action: "update", label: `${region!.name} / ${sub.name}`, detail: bits.join("・") || undefined, values });
        } else {
          skippedCount++;
          display.push({ row: r.row, action: "skip", label: `${region!.name} / ${sub.name}`, detail: "無變更", values });
        }
      } else {
        if (!r.subName) {
          errors.push({ row: r.row, message: "要新增次分類但缺少次分類名稱" });
          continue;
        }
        createdCount++;
        willApply = true;
        display.push({ row: r.row, action: "create", label: `${r.regionName || region?.name} / ${r.subName}`, detail: "新次分類", values });
      }
    } else {
      // Region-only row.
      if (seenRegionOnly.has(regionKey)) {
        duplicates.push({ row: r.row, message: `檔案內重複的主分類（${r.regionName || region?.name}），已略過` });
        display.push({ row: r.row, action: "skip", label: `${r.regionName || region?.name}`, detail: "檔案內重複", duplicate: true, values });
        skippedCount++;
        continue;
      }
      seenRegionOnly.add(regionKey);

      if (regionIsNew) {
        willApply = true;
        display.push({ row: r.row, action: "create", label: r.regionName, detail: "新主分類", values });
        // already counted above
      } else {
        const changed =
          (!!r.regionName && r.regionName !== region!.name) ||
          (!!r.regionSlug && r.regionSlug !== region!.slug) ||
          r.seoTitle !== (region!.seoTitle ?? "") ||
          r.seoDescription !== (region!.seoDescription ?? "");
        if (changed) {
          updatedCount++;
          willApply = true;
          display.push({ row: r.row, action: "update", label: region!.name, detail: `代碼 ${region!.code ?? ""}`, values });
        } else {
          skippedCount++;
          display.push({ row: r.row, action: "skip", label: region!.name, detail: "無變更", values });
        }
      }
    }

    if (willApply) valid.push(r);
  }

  const preview: ImportPreview = {
    rows: display,
    columns: [
      { key: "regionName", label: "主分類" },
      { key: "regionSlug", label: "主分類網址" },
      { key: "subName", label: "次分類" },
      { key: "subSlug", label: "次分類網址" },
      { key: "seoTitle", label: "SEO標題" },
      { key: "seoDescription", label: "SEO描述" },
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

async function uniqueRegionSlug(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = randSlug();
    if (!(await tx.region.findUnique({ where: { slug } }))) return slug;
  }
  throw new Error("無法產生唯一的主分類 slug");
}
async function uniqueSubSlug(tx: Prisma.TransactionClient, regionId: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = randSlug();
    if (!(await tx.subRegion.findFirst({ where: { regionId, slug } }))) return slug;
  }
  throw new Error("無法產生唯一的次分類 slug");
}

/**
 * Slug for a region being created. A provided slug wins (re-checked for
 * uniqueness to guard against batch races); otherwise derive from the name,
 * falling back to a random slug when the name yields nothing usable (e.g. a
 * purely Chinese name). Provided slugs are format-validated in analyzeRegions.
 */
async function pickRegionSlug(tx: Prisma.TransactionClient, r: RegionRow): Promise<string> {
  if (r.regionSlug) {
    if (await tx.region.findUnique({ where: { slug: r.regionSlug }, select: { id: true } })) {
      throw new Error(`主分類網址「${r.regionSlug}」已被使用`);
    }
    return r.regionSlug;
  }
  const derived = slugify(r.regionName);
  if (derived && !(await tx.region.findUnique({ where: { slug: derived }, select: { id: true } }))) {
    return derived;
  }
  return uniqueRegionSlug(tx);
}

/** Slug for a subRegion being created (see pickRegionSlug). Unique per region. */
async function pickSubSlug(tx: Prisma.TransactionClient, regionId: string, r: RegionRow): Promise<string> {
  if (r.subSlug) {
    if (await tx.subRegion.findFirst({ where: { regionId, slug: r.subSlug }, select: { id: true } })) {
      throw new Error(`次分類網址「${r.subSlug}」已被使用`);
    }
    return r.subSlug;
  }
  const derived = slugify(r.subName);
  if (derived && !(await tx.subRegion.findFirst({ where: { regionId, slug: derived }, select: { id: true } }))) {
    return derived;
  }
  return uniqueSubSlug(tx, regionId);
}

/**
 * Match an existing region/sub whose stored name only differs from `name` by
 * surrounding whitespace. Fallback after an exact lookup misses, so legacy dirty
 * rows are reused (and their names cleaned on update) rather than duplicated.
 */
async function findRegionRecordByTrimmedName(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<{ id: string; name: string; code: string | null } | null> {
  const all = await tx.region.findMany({ select: { id: true, name: true, code: true } });
  return all.find((r) => r.name.trim() === name) ?? null;
}

async function findSubRecordByTrimmedName(
  tx: Prisma.TransactionClient,
  regionId: string,
  name: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const all = await tx.subRegion.findMany({ where: { regionId }, select: { id: true, name: true, slug: true } });
  return all.find((s) => s.name.trim() === name) ?? null;
}

/** Apply the valid rows idempotently inside a transaction. */
export async function commitRegions(rows: RegionRow[]): Promise<void> {
  await db.$transaction(async (tx) => {
    // Resolve/create a region by the row, updating region-level fields for region-only rows.
    const regionIdByKey = new Map<string, string>();
    // Regions whose slug has already been applied this batch (once per region,
    // on its first appearing row) so regions that only appear with subRegions
    // stay editable and we don't repeatedly re-check the same slug.
    const regionSlugApplied = new Set<string>();

    for (const r of rows) {
      // --- region ---
      let regionId: string | undefined;
      let regionRecord = null as null | { id: string; name: string; code: string | null };

      if (r.regionCode) {
        regionRecord = await tx.region.findUnique({ where: { code: r.regionCode }, select: { id: true, name: true, code: true } });
      }
      if (!regionRecord && !r.regionCode && r.regionName) {
        // Exact match first; fall back to a whitespace-trimmed match so legacy
        // dirty names (e.g. "日本 ") are reused instead of duplicated.
        regionRecord =
          (await tx.region.findUnique({ where: { name: r.regionName }, select: { id: true, name: true, code: true } })) ??
          (await findRegionRecordByTrimmedName(tx, r.regionName));
      }
      const keyName = r.regionName ? `name:${r.regionName}` : "";
      if (!regionRecord && keyName && regionIdByKey.has(keyName)) {
        regionId = regionIdByKey.get(keyName);
      }

      if (regionRecord) {
        regionId = regionRecord.id;
      } else if (!regionId) {
        // create new region (mint fresh code, ignore any provided code)
        const code = await nextRegionCode(tx);
        const slug = await pickRegionSlug(tx, r);
        const max = await tx.region.aggregate({ _max: { sortOrder: true } });
        const created = await tx.region.create({
          data: {
            name: r.regionName,
            slug,
            code,
            sortOrder: (max._max.sortOrder ?? -1) + 1,
          },
        });
        regionId = created.id;
        regionSlugApplied.add(regionId); // slug set at creation
        if (keyName) regionIdByKey.set(keyName, regionId);
      }

      // Apply a provided slug to an existing region, once, on its first row
      // (whether or not that row also carries a subRegion).
      if (r.regionSlug && regionId && !regionSlugApplied.has(regionId)) {
        regionSlugApplied.add(regionId);
        const cur = await tx.region.findUnique({ where: { id: regionId }, select: { slug: true } });
        if (cur && cur.slug !== r.regionSlug) {
          const conflict = await tx.region.findUnique({ where: { slug: r.regionSlug }, select: { id: true } });
          if (conflict && conflict.id !== regionId) {
            throw new Error(`主分類網址「${r.regionSlug}」已被使用`);
          }
          await tx.region.update({ where: { id: regionId }, data: { slug: r.regionSlug } });
        }
      }

      const hasSub = !!(r.subCode || r.subName);

      if (!hasSub) {
        // region-only: update name/SEO if this is an existing region
        if (regionRecord) {
          const data: Prisma.RegionUpdateInput = {};
          if (r.regionName && r.regionName !== regionRecord.name) data.name = r.regionName;
          if (r.seoTitle) data.seoTitle = r.seoTitle;
          else data.seoTitle = null;
          if (r.seoDescription) data.seoDescription = r.seoDescription;
          else data.seoDescription = null;
          await tx.region.update({ where: { id: regionId! }, data });
        }
        continue;
      }

      // --- sub ---
      let sub = null as null | { id: string; name: string; slug: string };
      if (r.subCode) {
        sub = await tx.subRegion.findFirst({ where: { regionId: regionId!, code: r.subCode }, select: { id: true, name: true, slug: true } });
      }
      if (!sub && r.subName) {
        sub =
          (await tx.subRegion.findFirst({ where: { regionId: regionId!, name: r.subName }, select: { id: true, name: true, slug: true } })) ??
          (await findSubRecordByTrimmedName(tx, regionId!, r.subName));
      }

      if (sub) {
        const data: Prisma.SubRegionUpdateInput = {};
        if (r.subName && r.subName !== sub.name) data.name = r.subName;
        if (r.subSlug && r.subSlug !== sub.slug) {
          const conflict = await tx.subRegion.findFirst({ where: { regionId: regionId!, slug: r.subSlug }, select: { id: true } });
          if (conflict && conflict.id !== sub.id) {
            throw new Error(`次分類網址「${r.subSlug}」已被使用`);
          }
          data.slug = r.subSlug;
        }
        data.seoTitle = r.seoTitle || null;
        data.seoDescription = r.seoDescription || null;
        await tx.subRegion.update({ where: { id: sub.id }, data });
      } else {
        const code = await nextSubCode(tx, regionId!);
        const slug = await pickSubSlug(tx, regionId!, r);
        const max = await tx.subRegion.aggregate({ where: { regionId: regionId! }, _max: { sortOrder: true } });
        await tx.subRegion.create({
          data: {
            regionId: regionId!,
            name: r.subName,
            slug,
            code,
            sortOrder: (max._max.sortOrder ?? -1) + 1,
            seoTitle: r.seoTitle || null,
            seoDescription: r.seoDescription || null,
          },
        });
      }
    }
  });
}

export async function buildRegionExport(): Promise<Buffer> {
  const regions = await db.region.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subRegions: { orderBy: { sortOrder: "asc" } } },
  });
  const rows: (string | number | null)[][] = [];
  for (const region of regions) {
    if (region.subRegions.length === 0) {
      rows.push([region.code ?? "", region.name, region.slug, "", "", "", region.seoTitle ?? "", region.seoDescription ?? ""]);
    } else {
      for (const sub of region.subRegions) {
        rows.push([region.code ?? "", region.name, region.slug, sub.code ?? "", sub.name, sub.slug, sub.seoTitle ?? "", sub.seoDescription ?? ""]);
      }
    }
  }
  return buildWorkbook(REGION_SHEET, REGION_HEADERS, rows);
}

export async function buildRegionTemplate(): Promise<Buffer> {
  return buildWorkbook(REGION_SHEET, REGION_HEADERS, [
    ["", "範例主分類", "example-region", "", "範例次分類甲", "example-sub-a", "", ""],
    ["", "範例主分類", "example-region", "", "範例次分類乙", "example-sub-b", "", ""],
  ]);
}

export async function readRegionRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  return readFirstSheetRows(buf);
}
