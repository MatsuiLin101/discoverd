/**
 * Thin exceljs wrappers shared by every module's import/export.
 * Reading always flattens cells to trimmed-agnostic strings; the caller decides
 * how to interpret each column.
 */
import ExcelJS from "exceljs";

export interface SheetRow {
  /** 1-based Excel row number (per worksheet), for error reporting. */
  rowNumber: number;
  /** Worksheet name the row came from (for multi-sheet files). */
  sheetName?: string;
  /** Cell text by 0-based column index. */
  cells: string[];
}

/** Convert any exceljs cell value to a plain string. */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if ("result" in v) return v.result == null ? "" : String(v.result);
    if ("text" in v) return String(v.text);
    if ("hyperlink" in v && "text" in v) return String(v.text);
  }
  return String(value);
}

/** Read the first worksheet as rows of string cells (empty rows dropped). */
export async function readFirstSheetRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: SheetRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellText(cell.value);
    });
    // Drop rows that are entirely blank.
    if (cells.some((c) => (c ?? "").trim() !== "")) {
      rows.push({ rowNumber, sheetName: ws.name, cells });
    }
  });
  return rows;
}

/** Read every worksheet as rows of string cells (empty rows dropped). */
export async function readAllSheetRows(buf: ArrayBuffer): Promise<SheetRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const rows: SheetRow[] = [];
  wb.worksheets.forEach((ws) => {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells[colNumber - 1] = cellText(cell.value);
      });
      if (cells.some((c) => (c ?? "").trim() !== "")) {
        rows.push({ rowNumber, sheetName: ws.name, cells });
      }
    });
  });
  return rows;
}

export type CellValue = string | number | null;

/** Sanitize a worksheet name: strip characters Excel forbids and cap at 31. */
export function sanitizeSheetName(name: string): string {
  let n = name.replace(/[[\]*?/\\:]/g, "").trim();
  if (n.length === 0) n = "Sheet";
  return n.length > 31 ? n.slice(0, 31) : n;
}

/** Build a single-sheet .xlsx buffer with a bold header row. */
export async function buildWorkbook(
  sheetName: string,
  headers: string[],
  rows: CellValue[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  // Reasonable default widths based on header length.
  ws.columns.forEach((col, i) => {
    const header = headers[i] ?? "";
    col.width = Math.min(Math.max(header.length + 4, 12), 40);
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export interface WorkbookSheet {
  name: string;
  headers: string[];
  rows: CellValue[][];
}

/** Build a multi-sheet .xlsx buffer (one worksheet per entry, bold headers). */
export async function buildMultiSheetWorkbook(sheets: WorkbookSheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  if (sheets.length === 0) wb.addWorksheet("(無資料)");
  for (const s of sheets) {
    const ws = wb.addWorksheet(sanitizeSheetName(s.name));
    ws.addRow(s.headers);
    ws.getRow(1).font = { bold: true };
    for (const r of s.rows) ws.addRow(r);
    ws.columns.forEach((col, i) => {
      const header = s.headers[i] ?? "";
      col.width = Math.min(Math.max(header.length + 4, 12), 40);
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Wrap an xlsx buffer in a download Response with a UTF-8-safe filename. */
export function xlsxDownload(buf: Buffer, filename: string): Response {
  const asciiName = filename.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

/** YYYYMMDD in Asia/Taipei, for export filenames. */
export function exportDateStamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}${get("month")}${get("day")}`;
}
