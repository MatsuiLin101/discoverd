"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TourDetailData, RelatedTour } from "@/lib/frontend-data";
import TourMediaGallery from "./TourMediaGallery";
import TourShareButton from "./TourShareButton";
import TourDetailActions from "./TourDetailActions";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";
import { trackEvent } from "@/lib/analytics";

interface Props {
  tour: TourDetailData;
  /** Heading level for the tour name: h1 on the standalone page, h3 in the modal. */
  headingTag?: "h1" | "h3";
  /** Auto-picked same-region recommendations; hidden when empty. */
  related?: RelatedTour[];
}

/**
 * Shared tour detail card (gallery + info + actions). Rendered identically by
 * the standalone tour page and the intercepted modal so both look the same.
 * The card owns the mobile collapse toggle; the outer frame (page vs overlay)
 * is provided by the caller.
 */
export default function TourDetailCard({ tour, headingTag = "h3", related = [] }: Props) {
  // Collapsed by default so mobile opens showing the gallery with a compact
  // info bar; the user expands to read the full intro. Desktop ignores the
  // `.collapsed` class (styled only under the mobile media query) and always
  // shows everything, so this default has no effect there.
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const Heading = headingTag;

  // Fire a GA4 view_item event once per tour shown, whether opened as the
  // standalone page or the intercepted modal (both render this card). The ref
  // guard keeps it to a single event per tour id: React StrictMode re-invokes
  // effects in dev, and the modal can re-render with a fresh tour object.
  const viewedTourRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewedTourRef.current === tour.id) return;
    viewedTourRef.current = tour.id;
    trackEvent("view_item", {
      tour_id: tour.id,
      tour_name: tour.name,
      region: tour.regionSlug,
      tags: tour.tags.join(","),
      item_id: tour.productId ?? tour.id,
      content_type: "tour",
    });
  }, [tour.id, tour.name, tour.regionSlug, tour.tags, tour.productId]);

  // Scroll affordance for the mobile intro: when the expanded intro overflows
  // and isn't scrolled to the end, `moreBelow` fades its bottom edge so users
  // can tell there's more to read (see `.more-below` in frontend.css).
  const introRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);

  const updateScrollCue = useCallback(() => {
    const el = introRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  // Recompute after expand/collapse and on resize (rAF lets layout settle).
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollCue);
    window.addEventListener("resize", updateScrollCue);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", updateScrollCue);
    };
  }, [mobileCollapsed, updateScrollCue]);

  return (
    <>
      <TourMediaGallery media={tour.media} thumbnail={tour.thumbnail} alt={tour.name} related={related} />

      <aside
        className={`fh-modal-side${mobileCollapsed ? " collapsed" : ""}${moreBelow ? " more-below" : ""}`}
      >
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

        <div className="m-top" ref={introRef} onScroll={updateScrollCue}>
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
          <span className="m-scroll-cue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
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
