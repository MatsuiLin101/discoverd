import Image from "next/image";
import { cropVars, type ThumbCrop } from "@/lib/crop";

interface Props {
  src: string;
  alt: string;
  /** Normalized crop rect, or null to fall back to plain object-fit: cover. */
  crop?: ThumbCrop | null;
  /** Passed to next/image when no crop is applied. */
  sizes?: string;
  /** Optional priority hint for above-the-fold thumbnails. */
  priority?: boolean;
}

/**
 * Shared tour / region / subregion thumbnail.
 *
 * With a crop, the original image is scaled and offset with pure CSS (via the
 * `.thumb-crop` rule + custom properties) so the chosen rectangle exactly fills
 * the surrounding fixed-ratio box — no re-compression, editable later.
 * Without a crop, it renders as before with `object-fit: cover`, keeping legacy
 * data visually unchanged. The parent element owns the aspect-ratio box.
 */
export default function CroppedThumb({ src, alt, crop, sizes, priority }: Props) {
  if (crop) {
    return (
      <div className="thumb-crop" style={cropVars(crop)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} />
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
