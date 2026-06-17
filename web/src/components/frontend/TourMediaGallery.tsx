"use client";

import dynamic from "next/dynamic";
import type { TourMedia } from "@/lib/frontend-data";

// PDF rendering relies on browser APIs (canvas / pdf.js worker) — client only.
const TourPdfDoc = dynamic(() => import("./TourPdfDoc"), {
  ssr: false,
  loading: () => <div className="fh-pdf-loading">PDF 載入中…</div>,
});

interface Props {
  media: TourMedia[];
  thumbnail: string | null;
  alt: string;
}

/**
 * Shared tour content gallery: renders images inline and PDFs page-by-page,
 * preserving admin sort order. Falls back to the thumbnail when no files exist.
 */
export default function TourMediaGallery({ media, thumbnail, alt }: Props) {
  const items: TourMedia[] =
    media.length > 0
      ? media
      : thumbnail
        ? [{ kind: "image", url: thumbnail, filename: null }]
        : [];

  return (
    <div className="fh-modal-gallery">
      <div className="fh-gallery-scroll">
        {items.map((m, i) =>
          m.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={m.url} alt={alt} />
          ) : (
            <TourPdfDoc key={i} url={m.url} filename={m.filename} />
          )
        )}
      </div>
    </div>
  );
}
