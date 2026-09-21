/**
 * Cloudflare Image Transformations URL builder.
 *
 * Serves images through `/cdn-cgi/image/...` on our storage zone, so resizing
 * and format negotiation (AVIF/WebP) happen at Cloudflare's edge instead of on
 * the Next.js server. Sources that are not on our storage zone — the bundled
 * `/images/*` placeholders, the local-driver `/uploads/*` paths and the Unsplash
 * fallback — are returned untouched, since CF Transformations only work within
 * our own zone.
 *
 * Plain module (no "use client") so it is safe to call from Server Components,
 * shared components and the client loader alike.
 */
const STORAGE_BASE = (process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

/** Never request a source wider than this from the transform service. */
const MAX_SOURCE_WIDTH = 2400;

/**
 * Build a Cloudflare-transformed URL for a stored image at the given width.
 * Returns `src` unchanged when it is not on our storage zone.
 *
 * `onerror=redirect` makes Cloudflare fall back to the original image whenever a
 * transformation cannot be produced — most importantly once the monthly free
 * transformation allowance is exhausted (new variants would otherwise 9422 into
 * a broken image). The original is on the same zone, so the redirect resolves.
 */
export function cfImageUrl(src: string, width: number, quality = 75): string {
  if (!STORAGE_BASE || !src.startsWith(STORAGE_BASE)) return src;
  const path = src.slice(STORAGE_BASE.length).replace(/^\/+/, "");
  const w = Math.min(Math.round(width), MAX_SOURCE_WIDTH);
  const opts = `width=${w},quality=${quality},format=auto,fit=scale-down,onerror=redirect`;
  return `${STORAGE_BASE}/cdn-cgi/image/${opts}/${path}`;
}
