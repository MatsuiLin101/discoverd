/**
 * Tag module import/export. Tags have only a name (identity = unique name), so
 * import creates missing names and skips existing ones — there is nothing to
 * update.
 */
import { db } from "@/lib/db";
import { readFirstSheetRows, buildWorkbook, type SheetRow } from "./xlsx";
import type { ImportPreview, PreviewRowDisplay, RowIssue } from "./import-core";

export const TAG_SHEET = "標籤";
export const TAG_HEADERS = ["標籤名稱"];

export interface TagImportPayload {
  names: string[]; // names to create
}

/** Build a preview from parsed sheet rows. */
export async function buildTagPreview(
  rows: SheetRow[],
): Promise<{ preview: ImportPreview; payload: TagImportPayload }> {
  const display: PreviewRowDisplay[] = [];
  const errors: RowIssue[] = [];
  const duplicates: RowIssue[] = [];
  const toCreate: string[] = [];
  const seen = new Set<string>();

  const existing = new Set(
    (await db.tag.findMany({ select: { name: true } })).map((t) => t.name),
  );

  for (const { rowNumber, cells } of rows) {
    if (rowNumber === 1) continue; // header
    const name = (cells[0] ?? "").trim();
    if (!name) continue;
    if (seen.has(name)) {
      duplicates.push({ row: rowNumber, message: `檔案內重複的標籤「${name}」，已略過` });
      display.push({ row: rowNumber, action: "skip", label: name, detail: "檔案內重複", duplicate: true });
      continue;
    }
    seen.add(name);
    if (existing.has(name)) {
      display.push({ row: rowNumber, action: "skip", label: name, detail: "已存在" });
    } else {
      toCreate.push(name);
      display.push({ row: rowNumber, action: "create", label: name });
    }
  }

  const preview: ImportPreview = {
    rows: display,
    createdCount: toCreate.length,
    updatedCount: 0,
    skippedCount: display.filter((r) => r.action === "skip").length,
    errors,
    duplicates,
  };
  return { preview, payload: { names: toCreate } };
}

/** Apply a committed tag import. */
export async function commitTagImport(
  payload: TagImportPayload,
): Promise<{ createdCount: number; updatedCount: number; skippedCount: number }> {
  let created = 0;
  let skipped = 0;
  const max = await db.tag.aggregate({ _max: { sortOrder: true } });
  let sortOrder = (max._max.sortOrder ?? -1) + 1;
  for (const name of payload.names) {
    const exists = await db.tag.findUnique({ where: { name } });
    if (exists) {
      skipped++;
      continue;
    }
    await db.tag.create({ data: { name, sortOrder: sortOrder++ } });
    created++;
  }
  return { createdCount: created, updatedCount: 0, skippedCount: skipped };
}

export async function buildTagExport(): Promise<Buffer> {
  const tags = await db.tag.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return buildWorkbook(TAG_SHEET, TAG_HEADERS, tags.map((t) => [t.name]));
}

export async function buildTagTemplate(): Promise<Buffer> {
  return buildWorkbook(TAG_SHEET, TAG_HEADERS, [["範例標籤一"], ["範例標籤二"]]);
}

/** Parse an uploaded workbook into rows (shared by the preview route). */
export async function readTagRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  return readFirstSheetRows(buf);
}
