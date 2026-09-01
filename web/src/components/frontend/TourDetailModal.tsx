"use client";

import { useState, useEffect } from "react";
import type { TourModalData } from "@/lib/frontend-data";
import TourInquiryModal from "./TourInquiryModal";
import TourShareButton from "./TourShareButton";
import TourMediaGallery from "./TourMediaGallery";
import LineIcon from "./LineIcon";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";

interface Props {
  tour: TourModalData | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shared tour detail modal (gallery + info + inquiry form). Used by the
 * sub-region listing (TourSection) and the /search results page so both open
 * a tour in place instead of navigating to /tours/[slug].
 */
export default function TourDetailModal({ tour, isOpen, onClose }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  const { lineUrl } = useSocialLinks();

  // Reset the mobile collapse / inquiry state each time a tour opens.
  useEffect(() => {
    if (isOpen) {
      setMobileCollapsed(false);
      setFormOpen(false);
    }
  }, [isOpen, tour?.id]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape closes the detail modal (the inquiry form handles its own ESC).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !formOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, formOpen, onClose]);

  return (
    <>
      <div
        className={`fh-modal-overlay${isOpen ? " open" : ""}`}
        aria-hidden={!isOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="fh-modal" role="dialog" aria-modal="true">
          <button className="fh-modal-x" onClick={onClose} aria-label="關閉">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {tour && (
            <TourMediaGallery media={tour.media} thumbnail={tour.thumbnail} alt={tour.name} />
          )}

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
                {tour ? `${tour.regionName} ・ ${tour.subRegionName}` : ""}
              </div>
              <div className="m-name-row">
                <h3 className="m-name">{tour?.name}</h3>
                {tour && <TourShareButton key={tour.slug} urlId={tour.productId ?? tour.slug} />}
              </div>
              <div className="m-tags">
                {tour?.tags.map((tag) => (
                  <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
                ))}
              </div>
              {tour?.description && <p className="m-lede">{tour.description}</p>}
            </div>

            <div className="m-bottom">
              <div>
                <div className="m-price">
                  {tour && isCustomQuote(tour.price) ? (
                    <span className="custom-quote">{CUSTOM_QUOTE_LABEL}</span>
                  ) : (
                    <>
                      <span className="cur">NT$</span>
                      <span className="num">{tour?.price.toLocaleString("zh-TW")}</span>
                      <span className="unit">起</span>
                    </>
                  )}
                </div>
                <p className="m-note">※ 優惠方案及出發日期請洽服務專員</p>
              </div>
              <div className="m-actions">
                {lineUrl ? (
                  <a className="m-line" href={lineUrl} target="_blank" rel="noopener noreferrer">
                    <LineIcon />
                    加 LINE 諮詢
                  </a>
                ) : (
                  <button className="m-line" type="button" disabled>
                    <LineIcon />
                    加 LINE 諮詢
                  </button>
                )}
                <button
                  className="m-form"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormOpen(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 4h6a2 2 0 0 1 2 2v0M9 4a2 2 0 0 0-2 2v0M9 4V3m6 1V3M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 13h6M9 17h4" />
                  </svg>
                  填寫諮詢單
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <TourInquiryModal
        tourId={tour?.id ?? null}
        tourName={tour?.name ?? ""}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
