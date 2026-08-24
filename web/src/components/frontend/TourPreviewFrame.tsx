"use client";

import { useState } from "react";
import { useSocialLinks } from "@/hooks/useSocialLinks";
import type { TourMedia } from "@/lib/frontend-data";
import TourShareButton from "./TourShareButton";
import TourMediaGallery from "./TourMediaGallery";
import LineIcon from "./LineIcon";

interface Tour {
  slug: string;
  productId: string | null;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  tags: string[];
  media: TourMedia[];
  regionName: string;
  subRegionName: string;
}

export default function TourPreviewFrame({ tour }: { tour: Tour }) {
  const [collapsed, setCollapsed] = useState(false);
  const { lineUrl } = useSocialLinks();

  return (
    <div className="fh-modal-overlay open">
      <div className="fh-modal">
        {/* Gallery */}
        <TourMediaGallery media={tour.media} thumbnail={tour.thumbnail} alt={tour.name} />

        {/* Info side */}
        <aside className={`fh-modal-side${collapsed ? " collapsed" : ""}`}>
          <button
            className="fh-m-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="展開或收合說明"
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
              <h3 className="m-name">{tour.name}</h3>
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
                <span className="cur">NT$</span>
                <span className="num">{tour.price.toLocaleString("zh-TW")}</span>
                <span className="unit">起</span>
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
              <button className="m-form" type="button">
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
  );
}
