import { z } from "zod";

/**
 * A crop rectangle over an original image, normalized to 0..1:
 *  - x, y: top-left corner as a fraction of the image width / height
 *  - w, h: rectangle width / height as a fraction of the image width / height
 *
 * The display box aspect ratio is fixed per surface (tour = 4:3, region /
 * subregion = 16:9), so the ratio is NOT stored here — the cropper enforces it
 * and the CSS reconstruction reproduces the rect exactly. `null` means "no crop"
 * and callers fall back to plain `object-fit: cover`.
 */
export type ThumbCrop = { x: number; y: number; w: number; h: number };

/** Zod schema for server-side validation of an incoming crop payload. */
export const cropSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  })
  .refine((c) => c.w > 0 && c.h > 0, "裁切範圍無效")
  .refine((c) => c.x + c.w <= 1.001 && c.y + c.h <= 1.001, "裁切範圍超出圖片");

/**
 * Parse a crop value coming from a FormData string field.
 * Returns the validated crop, or null for empty / invalid input.
 */
export function parseCropField(raw: FormDataEntryValue | null): ThumbCrop | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = cropSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Normalize a crop value read back from the DB (Prisma `Json?`, so `unknown`).
 * Returns a clean ThumbCrop or null when absent / malformed.
 */
export function normalizeCrop(raw: unknown): ThumbCrop | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = cropSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Inline CSS custom properties consumed by the `.thumb-crop` rule. */
export function cropVars(crop: ThumbCrop | null | undefined): Record<string, string> | undefined {
  if (!crop) return undefined;
  return {
    "--cx": String(crop.x),
    "--cy": String(crop.y),
    "--cw": String(crop.w),
    "--ch": String(crop.h),
  };
}
