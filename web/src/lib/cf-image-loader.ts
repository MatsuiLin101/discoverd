"use client";

import { cfImageUrl } from "@/lib/cf-image";

/**
 * Global custom loader for next/image, registered via `images.loaderFile` in
 * next.config.ts. Every `next/image` on the site (frontend and admin) is served
 * through Cloudflare Image Transformations (see cf-image.ts). Next requires this
 * file to be a Client Component so the loader function can be serialized.
 *
 * The crop thumbnails render a raw `<img>` (CSS-reconstructed crop rect) and
 * cannot use this loader, so they call `cfImageUrl` directly — see CroppedThumb.
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cfImageUrl(src, width, quality ?? 75);
}
