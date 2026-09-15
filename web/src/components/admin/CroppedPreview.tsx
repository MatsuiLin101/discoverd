import type { ThumbCrop } from "@/lib/crop";

interface Props {
  src: string;
  alt?: string;
  /** Normalized crop rect; null falls back to object-fit: cover. */
  crop?: ThumbCrop | null;
  /** Tailwind classes that size the fixed-ratio box (e.g. "aspect-[4/3] w-40"). */
  className?: string;
  onClick?: () => void;
}

/**
 * Admin-side thumbnail preview that mirrors the front-end crop reconstruction
 * with inline styles (admin pages don't load frontend.css). Shows exactly what
 * the visitor will see for a given stored crop.
 */
export default function CroppedPreview({ src, alt = "", crop, className, onClick }: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      onClick={onClick}
    >
      {crop ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{
            position: "absolute",
            maxWidth: "none",
            width: `calc(100% / ${crop.w})`,
            height: `calc(100% / ${crop.h})`,
            left: `calc(-100% * ${crop.x} / ${crop.w})`,
            top: `calc(-100% * ${crop.y} / ${crop.h})`,
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
