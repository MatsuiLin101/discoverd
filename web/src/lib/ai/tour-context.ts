import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { GeminiPdfPart } from "./gemini";

/** Max saved candidates per (tour, kind). Enforced by the generation APIs. */
export const MAX_CANDIDATES_PER_KIND = 5;

/** Guardrails for feeding PDFs to Gemini (keep the request well under limits). */
const MAX_PDF_FILES = 3;
const MAX_PDF_TOTAL_BYTES = 15 * 1024 * 1024;

export interface TourAiContext {
  tour: { id: string; name: string; price: number; description: string | null };
  /** Structured text block describing the tour, fed to the model. */
  contextText: string;
  /** Attached PDF content files as base64 parts (may be empty). */
  pdfs: GeminiPdfPart[];
}

/**
 * Current (possibly unsaved) form values the editor wants the AI to use instead
 * of what's stored in the DB. Any field left undefined falls back to the DB.
 * PDFs always come from the DB (they are uploaded immediately, even in edit).
 */
export interface TourContextOverride {
  name?: string;
  price?: number;
  regionName?: string;
  subRegionName?: string;
  tagNames?: string[];
}

/** Parse/sanitise an untrusted `context` object from a request body. */
export function parseContextOverride(raw: unknown): TourContextOverride | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const priceNum = typeof c.price === "number" ? c.price : Number(c.price);
  return {
    name: typeof c.name === "string" && c.name.trim() ? c.name.trim() : undefined,
    price: Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : undefined,
    regionName: typeof c.regionName === "string" && c.regionName.trim() ? c.regionName.trim() : undefined,
    subRegionName:
      typeof c.subRegionName === "string" && c.subRegionName.trim() ? c.subRegionName.trim() : undefined,
    tagNames: Array.isArray(c.tagNames)
      ? c.tagNames.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : undefined,
  };
}

/**
 * Load a tour and assemble the context used for AI generation: a structured
 * text block (name / region / tags / price) plus any attached PDF content
 * files (Gemini reads them natively). Returns null if the tour is missing.
 *
 * `overrides` lets the caller substitute the editor's current unsaved form
 * values so generation reflects what's on screen without saving first.
 *
 * `options.includePdfs` (default true) controls whether attached PDFs are read
 * and fed to the model. Pass false to let the editor generate from the text
 * context only, skipping the PDF reads entirely.
 */
export async function loadTourAiContext(
  tourId: string,
  overrides?: TourContextOverride,
  options?: { includePdfs?: boolean },
): Promise<TourAiContext | null> {
  const includePdfs = options?.includePdfs ?? true;
  const tour = await db.tour.findUnique({
    where: { id: tourId },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      subRegion: { select: { name: true, region: { select: { name: true } } } },
      tags: { select: { name: true } },
      files: { orderBy: { sortOrder: "asc" }, select: { key: true, mimeType: true, filename: true } },
    },
  });
  if (!tour) return null;

  const name = overrides?.name ?? tour.name;
  const price = overrides?.price ?? tour.price;
  const regionName = overrides?.regionName ?? (tour.subRegion?.region?.name ?? "");
  const subRegionName = overrides?.subRegionName ?? (tour.subRegion?.name ?? "");
  const tagNames = overrides?.tagNames ?? tour.tags.map((t) => t.name);

  const lines = [
    `行程名稱：${name}`,
    regionName || subRegionName ? `地區：${[regionName, subRegionName].filter(Boolean).join(" / ")}` : null,
    tagNames.length ? `標籤：${tagNames.join("、")}` : null,
    price > 0 ? `參考價格：NT$ ${price.toLocaleString()}` : "價格：客製化報價",
  ].filter(Boolean);

  // Load attached PDFs (best-effort; skip anything that fails to read).
  // When the caller opted out, skip the reads entirely and send text only.
  const pdfs: GeminiPdfPart[] = [];
  let total = 0;
  for (const file of includePdfs ? tour.files : []) {
    if (pdfs.length >= MAX_PDF_FILES) break;
    if (file.mimeType !== "application/pdf") continue;
    try {
      const buf = await storage.get(file.key);
      if (total + buf.length > MAX_PDF_TOTAL_BYTES) continue;
      total += buf.length;
      pdfs.push({ data: buf.toString("base64"), mimeType: "application/pdf", filename: file.filename ?? undefined });
    } catch {
      // ignore unreadable file
    }
  }

  return {
    tour: { id: tour.id, name, price, description: tour.description },
    contextText: lines.join("\n"),
    pdfs,
  };
}
