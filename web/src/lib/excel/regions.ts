/**
 * Region + SubRegion (two-level) import/export in a single sheet.
 *
 * Columns: 主分類代碼 | 主分類名稱 | 次分類代碼 | 次分類名稱 | SEO標題 | SEO描述
 *   - Each row optionally defines a subRegion under a region.
 *   - A row with the subRegion columns blank defines only the region.
 *   - SEO columns apply to the subRegion when present, otherwise to the region.
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
import type { ImportPreview, PreviewRowDisplay, RowIssue } from "./import-core";

export const REGION_SHEET = "地區";
export const REGION_HEADERS = [
  "主分類代碼",
  "主分類名稱",
  "次分類代碼",
  "次分類名稱",
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
}

export interface RegionImportPayload {
  rows: RegionRow[];
}

function parseRow(sr: SheetRow): RegionRow {
  const c = (i: number) => (sr.cells[i] ?? "").trim();
  return {
    row: sr.rowNumber,
    regionCode: c(0),
    regionName: c(1),
    subCode: c(2),
    subName: c(3),
    seoTitle: c(4),
    seoDescription: c(5),
  };
}

interface RegionInfo {
  id: string;
  name: string;
  code: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}
interface SubInfo {
  id: string;
  regionId: string;
  name: string;
  code: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Analyse rows against the current DB to produce a preview + a valid-row payload. */
export async function analyzeRegions(
  rows: SheetRow[],
): Promise<{ preview: ImportPreview; payload: RegionImportPayload }> {
  const regions = await db.region.findMany({
    select: { id: true, name: true, code: true, seoTitle: true, seoDescription: true },
  });
  const subs = await db.subRegion.findMany({
    select: { id: true, regionId: true, name: true, code: true, seoTitle: true, seoDescription: true },
  });

  const regionByCode = new Map<string, RegionInfo>();
  const regionByName = new Map<string, RegionInfo>();
  for (const r of regions) {
    if (r.code) regionByCode.set(r.code, r);
    regionByName.set(r.name, r);
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

  for (const sr of rows) {
    if (sr.rowNumber === 1) continue; // header
    const r = parseRow(sr);
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
    // Count a new region once (whether introduced by a region-only or a sub row).
    if (regionIsNew && !newRegionKeys.has(regionKey)) {
      newRegionKeys.add(regionKey);
      createdCount++;
    }

    const hasSub = !!(r.subCode || r.subName);

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
        display.push({ row: r.row, action: "skip", label: `${r.regionName || region?.name} / ${r.subName}`, detail: "檔案內重複", duplicate: true });
        skippedCount++;
        continue;
      }
      seenSubKeys.add(subKey);

      if (sub) {
        const changed =
          (!!r.subName && r.subName !== sub.name) ||
          r.seoTitle !== (sub.seoTitle ?? "") ||
          r.seoDescription !== (sub.seoDescription ?? "");
        if (changed) {
          updatedCount++;
          display.push({ row: r.row, action: "update", label: `${region!.name} / ${sub.name}`, detail: sub.code ? `代碼 ${region!.code}${sub.code}` : undefined });
        } else {
          skippedCount++;
          display.push({ row: r.row, action: "skip", label: `${region!.name} / ${sub.name}`, detail: "無變更" });
        }
      } else {
        if (!r.subName) {
          errors.push({ row: r.row, message: "要新增次分類但缺少次分類名稱" });
          continue;
        }
        createdCount++;
        display.push({ row: r.row, action: "create", label: `${r.regionName || region?.name} / ${r.subName}`, detail: "新次分類" });
      }
    } else {
      // Region-only row.
      if (seenRegionOnly.has(regionKey)) {
        duplicates.push({ row: r.row, message: `檔案內重複的主分類（${r.regionName || region?.name}），已略過` });
        display.push({ row: r.row, action: "skip", label: `${r.regionName || region?.name}`, detail: "檔案內重複", duplicate: true });
        skippedCount++;
        continue;
      }
      seenRegionOnly.add(regionKey);

      if (regionIsNew) {
        display.push({ row: r.row, action: "create", label: r.regionName, detail: "新主分類" });
        // already counted above
      } else {
        const changed =
          (!!r.regionName && r.regionName !== region!.name) ||
          r.seoTitle !== (region!.seoTitle ?? "") ||
          r.seoDescription !== (region!.seoDescription ?? "");
        if (changed) {
          updatedCount++;
          display.push({ row: r.row, action: "update", label: region!.name, detail: `代碼 ${region!.code ?? ""}` });
        } else {
          skippedCount++;
          display.push({ row: r.row, action: "skip", label: region!.name, detail: "無變更" });
        }
      }
    }

    valid.push(r);
  }

  const preview: ImportPreview = {
    rows: display,
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

/** Apply the valid rows idempotently inside a transaction. */
export async function commitRegions(rows: RegionRow[]): Promise<void> {
  await db.$transaction(async (tx) => {
    // Resolve/create a region by the row, updating region-level fields for region-only rows.
    const regionIdByKey = new Map<string, string>();

    for (const r of rows) {
      // --- region ---
      let regionId: string | undefined;
      let regionRecord = null as null | { id: string; name: string; code: string | null };

      if (r.regionCode) {
        regionRecord = await tx.region.findUnique({ where: { code: r.regionCode }, select: { id: true, name: true, code: true } });
      }
      if (!regionRecord && !r.regionCode && r.regionName) {
        regionRecord = await tx.region.findUnique({ where: { name: r.regionName }, select: { id: true, name: true, code: true } });
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
        const slug = await uniqueRegionSlug(tx);
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
        if (keyName) regionIdByKey.set(keyName, regionId);
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
      let sub = null as null | { id: string; name: string };
      if (r.subCode) {
        sub = await tx.subRegion.findFirst({ where: { regionId: regionId!, code: r.subCode }, select: { id: true, name: true } });
      }
      if (!sub && r.subName) {
        sub = await tx.subRegion.findFirst({ where: { regionId: regionId!, name: r.subName }, select: { id: true, name: true } });
      }

      if (sub) {
        const data: Prisma.SubRegionUpdateInput = {};
        if (r.subName && r.subName !== sub.name) data.name = r.subName;
        data.seoTitle = r.seoTitle || null;
        data.seoDescription = r.seoDescription || null;
        await tx.subRegion.update({ where: { id: sub.id }, data });
      } else {
        const code = await nextSubCode(tx, regionId!);
        const slug = await uniqueSubSlug(tx, regionId!);
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
      rows.push([region.code ?? "", region.name, "", "", region.seoTitle ?? "", region.seoDescription ?? ""]);
    } else {
      for (const sub of region.subRegions) {
        rows.push([region.code ?? "", region.name, sub.code ?? "", sub.name, sub.seoTitle ?? "", sub.seoDescription ?? ""]);
      }
    }
  }
  return buildWorkbook(REGION_SHEET, REGION_HEADERS, rows);
}

export async function buildRegionTemplate(): Promise<Buffer> {
  return buildWorkbook(REGION_SHEET, REGION_HEADERS, [
    ["", "範例主分類", "", "範例次分類甲", "", ""],
    ["", "範例主分類", "", "範例次分類乙", "", ""],
  ]);
}

export async function readRegionRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  return readFirstSheetRows(buf);
}
