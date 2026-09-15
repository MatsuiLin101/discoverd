/**
 * Column value normalisation shared by importer modules (and, for parseTags,
 * by the maintenance script). Rules mirror the client's agreed conventions.
 */

/** Split a comma-separated tag cell; trims, drops blanks, de-dupes (order kept). */
export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Parse a price cell to a non-negative integer; tolerates thousands separators and ".0". */
export function parsePrice(raw: string | undefined): number | null {
  const cleaned = (raw ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * Parse the "發布" (Y/N) column. Default is published; only an explicit "N"
 * (trimmed, case-insensitive) unpublishes — any other value counts as published.
 */
export function parsePublished(raw: string | undefined): boolean {
  return (raw ?? "").trim().toUpperCase() !== "N";
}

/** Render a boolean back to the Y/N column for export. */
export function formatPublished(published: boolean): string {
  return published ? "Y" : "N";
}
