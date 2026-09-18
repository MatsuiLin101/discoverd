/**
 * Build a clean meta description from arbitrary body text.
 *
 * - collapses runs of whitespace/newlines into single spaces,
 * - when longer than `max`, backs off to the last sentence-ending punctuation
 *   within the window (so it never cuts mid-sentence), otherwise trims trailing
 *   separators and appends an ellipsis,
 * - returns the cleaned `fallback` (or undefined) when the text is empty, so a
 *   page without its own copy still gets a sensible description.
 */
const SENTENCE_END = ["。", "！", "？", "；", ".", "!", "?", ";"];

export function metaDescription(
  text: string | null | undefined,
  opts: { max?: number; fallback?: string } = {},
): string | undefined {
  const max = opts.max ?? 155;
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();

  if (!cleaned) {
    const fb = (opts.fallback ?? "").replace(/\s+/g, " ").trim();
    return fb || undefined;
  }
  if (cleaned.length <= max) return cleaned;

  const window = cleaned.slice(0, max);
  // Prefer ending on a full sentence when the break point isn't too early.
  const punct = Math.max(...SENTENCE_END.map((p) => window.lastIndexOf(p)));
  if (punct >= max * 0.6) return window.slice(0, punct + 1);

  // Otherwise trim any trailing separator/space and add an ellipsis.
  return window.replace(/[，、,;；\s]+$/, "") + "…";
}
