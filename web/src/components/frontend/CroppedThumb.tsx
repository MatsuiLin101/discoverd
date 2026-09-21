import Image from "next/image";
import { cropVars, type ThumbCrop } from "@/lib/crop";
import { cfImageUrl } from "@/lib/cf-image";

interface Props {
  src: string;
  alt: string;
  /** Normalized crop rect, or null to fall back to plain object-fit: cover. */
  crop?: ThumbCrop | null;
  /** Passed to next/image when no crop is applied. */
  sizes?: string;
  /** Optional priority hint for above-the-fold thumbnails. */
  priority?: boolean;
  /**
   * Largest CSS px width the surrounding box occupies. Used only on the cropped
   * path to size the Cloudflare-transformed source: the cropped rect fills the
   * box, so the underlying image renders at `width / crop.w` px wide.
   */
  width?: number;
}

/**
 * Shared tour / region / subregion thumbnail.
 *
 * With a crop, the original image is scaled and offset with pure CSS (via the
 * `.thumb-crop` rule + custom properties) so the chosen rectangle exactly fills
 * the surrounding fixed-ratio box — no re-compression, editable later. The
 * source is fetched through Cloudflare Image Transformations at the size the
 * crop actually needs (1× + 2× for high-DPR screens) instead of the full
 * original, since a raw `<img>` can't use the global next/image loader.
 * Without a crop, it renders via next/image (also Cloudflare-backed), keeping
 * legacy data visually unchanged. The parent element owns the aspect-ratio box.
 */
export default function CroppedThumb({ src, alt, crop, sizes, priority, width = 400 }: Props) {
  if (crop) {
    // The cropped rect fills the box, so the <img> is scaled to box / crop.w.
    const sourceW = width / Math.max(crop.w, 0.05);
    const src1x = cfImageUrl(src, sourceW);
    const src2x = cfImageUrl(src, sourceW * 2);
    return (
      <div className="thumb-crop" style={cropVars(crop)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src1x}
          srcSet={src1x === src ? undefined : `${src1x} 1x, ${src2x} 2x`}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: "cover" }}
    />
  );
}
