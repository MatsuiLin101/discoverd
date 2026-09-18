"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { TourMedia, RelatedTour } from "@/lib/frontend-data";
import CroppedThumb from "./CroppedThumb";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";
import { trackEvent } from "@/lib/analytics";

// PDF rendering relies on browser APIs (canvas / pdf.js worker) — client only.
const TourPdfDoc = dynamic(() => import("./TourPdfDoc"), {
  ssr: false,
  loading: () => <div className="fh-pdf-loading">PDF 載入中…</div>,
});

interface Props {
  media: TourMedia[];
  thumbnail: string | null;
  alt: string;
  /** Auto-picked same-region recommendations, shown at the end of the scroll. */
  related?: RelatedTour[];
}

/**
 * Shared tour content gallery: renders images inline and PDFs page-by-page,
 * preserving admin sort order. Falls back to the thumbnail when no files exist.
 * The "相關行程" recommendations are appended to the end of the scroll so they
 * appear only after the tour's images / PDF pages have been scrolled through.
 */
export default function TourMediaGallery({ media, thumbnail, alt, related = [] }: Props) {
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

        {related.length > 0 && (
          <section className="fh-related" aria-label="相關行程">
            <h2 className="fh-related-title">相關行程</h2>
            <div className="fh-related-list">
              {related.map((r) => (
                <Link
                  key={r.productId ?? r.slug}
                  className="fh-related-item"
                  href={`/tours/${r.productId ?? r.slug}`}
                  onClick={() =>
                    trackEvent("select_content", {
                      content_type: "related_tour",
                      item_id: r.productId ?? r.slug,
                    })
                  }
                >
                  <div className="fh-related-thumb">
                    <CroppedThumb
                      src={r.thumbnail ?? "/images/tour-placeholder.svg"}
                      alt={r.name}
                      crop={r.thumbnail ? r.crop : null}
                      sizes="50px"
                    />
                  </div>
                  <div className="fh-related-body">
                    <span className="fh-related-sub">{r.subRegionName}</span>
                    <span className="fh-related-name">{r.name}</span>
                    <span className="fh-related-price">
                      {isCustomQuote(r.price)
                        ? CUSTOM_QUOTE_LABEL
                        : `NT$ ${r.price.toLocaleString("zh-TW")} 起`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
