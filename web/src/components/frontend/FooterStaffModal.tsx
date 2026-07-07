"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface StaffCard {
  id: string;
  url: string;
  mimeType: string;
  filename: string | null;
}

interface StaffRegion {
  id: string;
  name: string;
  cards: StaffCard[];
}

export default function FooterStaffModal({ isOpen, onClose }: Props) {
  const [regions, setRegions] = useState<StaffRegion[] | null>(null);
  const [error, setError] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Fetch once, the first time the modal is opened. Only setState in async
  // callbacks so no synchronous cascading render is triggered from the effect.
  useEffect(() => {
    if (!isOpen || startedRef.current) return;
    startedRef.current = true;
    fetch("/api/sales")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setRegions(json.data ?? []))
      .catch(() => setError(true));
  }, [isOpen]);

  const loading = regions === null && !error;
  const isEmpty = regions !== null && regions.length === 0;

  return (
    <div
      className={`fh-form-overlay${isOpen ? " open" : ""}`}
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fh-form-modal" role="dialog" aria-modal="true">
        <button className="fh-form-x" onClick={onClose} aria-label="關閉">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="fh-form-head">
          <div className="fh-form-eyebrow">聯絡資訊</div>
          <h3 className="fh-form-title">業務團隊</h3>
        </div>

        <div className="fh-form-body">
          {loading && <p className="fh-staff-placeholder">載入中…</p>}
          {!loading && error && (
            <p className="fh-staff-placeholder">載入失敗，請稍後再試。</p>
          )}
          {!loading && !error && isEmpty && (
            <p className="fh-staff-placeholder">業務名單即將上線，敬請期待。</p>
          )}
          {!loading && !error && !isEmpty && regions !== null && (
            <div className="fh-staff-list">
              {regions.map((region) => (
                <div key={region.id} className="fh-staff-region">
                  <h4 className="fh-staff-region-name">{region.name}</h4>
                  <div className="fh-staff-grid">
                    {region.cards.map((card) => {
                      const isImage = card.mimeType.startsWith("image/");
                      return (
                        <a
                          key={card.id}
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fh-staff-card"
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.url} alt={card.filename ?? "業務名片"} loading="lazy" />
                          ) : (
                            <span className="fh-staff-card-file">檢視名片（PDF）</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
