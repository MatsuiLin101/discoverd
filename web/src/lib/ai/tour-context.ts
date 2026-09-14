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
 * Load a tour and assemble the context used for AI generation: a structured
 * text block (name / region / tags / price) plus any attached PDF content
 * files (Gemini reads them natively). Returns null if the tour is missing.
 */
export async function loadTourAiContext(tourId: string): Promise<TourAiContext | null> {
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

  const regionName = tour.subRegion?.region?.name ?? "";
  const subRegionName = tour.subRegion?.name ?? "";
  const tagNames = tour.tags.map((t) => t.name);

  const lines = [
    `行程名稱：${tour.name}`,
    regionName || subRegionName ? `地區：${[regionName, subRegionName].filter(Boolean).join(" / ")}` : null,
    tagNames.length ? `標籤：${tagNames.join("、")}` : null,
    tour.price > 0 ? `參考價格：NT$ ${tour.price.toLocaleString()}` : "價格：客製化報價",
  ].filter(Boolean);

  // Load attached PDFs (best-effort; skip anything that fails to read).
  const pdfs: GeminiPdfPart[] = [];
  let total = 0;
  for (const file of tour.files) {
    if (pdfs.length >= MAX_PDF_FILES) break;
    if (file.mimeType !== "application/pdf") continue;
    try {
      const buf = await storage.get(file.key);
      if (total + buf.length > MAX_PDF_TOTAL_BYTES) continue;
      total += buf.length;
      pdfs.push({ data: buf.toString("base64"), mimeType: "application/pdf" });
    } catch {
      // ignore unreadable file
    }
  }

  return {
    tour: { id: tour.id, name: tour.name, price: tour.price, description: tour.description },
    contextText: lines.join("\n"),
    pdfs,
  };
}
