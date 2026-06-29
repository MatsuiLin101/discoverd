"use client";

import { useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FooterStaffModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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
          <p className="fh-staff-placeholder">業務名單即將上線，敬請期待。</p>
        </div>
      </div>
    </div>
  );
}
