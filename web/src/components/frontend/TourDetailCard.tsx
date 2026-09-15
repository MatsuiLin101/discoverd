"use client";

import { useState } from "react";
import type { TourDetailData } from "@/lib/frontend-data";
import TourMediaGallery from "./TourMediaGallery";
import TourShareButton from "./TourShareButton";
import TourDetailActions from "./TourDetailActions";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";

interface Props {
  tour: TourDetailData;
  /** Heading level for the tour name: h1 on the standalone page, h3 in the modal. */
  headingTag?: "h1" | "h3";
}

/**
 * Shared tour detail card (gallery + info + actions). Rendered identically by
 * the standalone tour page and the intercepted modal so both look the same.
 * The card owns the mobile collapse toggle; the outer frame (page vs overlay)
 * is provided by the caller.
 */
export default function TourDetailCard({ tour, headingTag = "h3" }: Props) {
  // Collapsed by default so mobile opens showing the gallery with a compact
  // info bar; the user expands to read the full intro. Desktop ignores the
  // `.collapsed` class (styled only under the mobile media query) and always
  // shows everything, so this default has no effect there.
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const Heading = headingTag;

  return (
    <>
      <TourMediaGallery media={tour.media} thumbnail={tour.thumbnail} alt={tour.name} />

      <aside className={`fh-modal-side${mobileCollapsed ? " collapsed" : ""}`}>
        <button
          className="fh-m-toggle"
          aria-expanded={!mobileCollapsed}
          aria-label="展開或收合說明"
          onClick={() => setMobileCollapsed((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className="m-top">
          <div className="m-eyebrow">
            {tour.regionName} ・ {tour.subRegionName}
          </div>
          <div className="m-name-row">
            <Heading className="m-name">{tour.name}</Heading>
            <TourShareButton urlId={tour.productId ?? tour.slug} />
          </div>
          <div className="m-tags">
            {tour.tags.map((tag) => (
              <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
            ))}
          </div>
          {tour.description && <p className="m-lede">{tour.description}</p>}
        </div>

        <div className="m-bottom">
          <div>
            <div className="m-price">
              {isCustomQuote(tour.price) ? (
                <span className="custom-quote">{CUSTOM_QUOTE_LABEL}</span>
              ) : (
                <>
                  <span className="cur">NT$</span>
                  <span className="num">{tour.price.toLocaleString("zh-TW")}</span>
                  <span className="unit">起</span>
                </>
              )}
            </div>
            <p className="m-note">※ 優惠方案及出發日期請洽服務專員</p>
          </div>
          <TourDetailActions tourId={tour.id} tourName={tour.name} />
        </div>
      </aside>
    </>
  );
}
