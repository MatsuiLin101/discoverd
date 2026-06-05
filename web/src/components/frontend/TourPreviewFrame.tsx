"use client";

import { useState } from "react";

interface Tour {
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  tags: string[];
  images: string[];
  regionName: string;
  subRegionName: string;
}

export default function TourPreviewFrame({ tour }: { tour: Tour }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fh-modal-overlay open">
      <div className="fh-modal">
        {/* Gallery */}
        <div className="fh-modal-gallery">
          <div className="fh-gallery-scroll">
            {tour.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={tour.name} />
            ))}
          </div>
        </div>

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
            <h3 className="m-name">{tour.name}</h3>
            {tour.description && <p className="m-lede">{tour.description}</p>}
            <div className="m-tags">
              {tour.tags.map((tag) => (
                <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
              ))}
            </div>
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
              <button className="m-line" type="button">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
                </svg>
                加 LINE 諮詢
              </button>
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
