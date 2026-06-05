"use client";

import { useState, useEffect } from "react";

interface TourPreview {
  name: string;
  slug: string;
  published: boolean;
}

interface Props {
  tour: TourPreview;
  onClose: () => void;
}

export default function TourPreviewModal({ tour, onClose }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  const previewUrl = `/tour-preview/${tour.slug}`;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-xl bg-white shadow-2xl"
        style={{ width: "95vw", height: "90vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3">
          <span className="flex-1 truncate text-sm font-medium text-gray-800">
            {tour.name}
          </span>
          {!tour.published && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              未發布
            </span>
          )}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("desktop")}
              className={`cursor-pointer px-3 py-1.5 transition-colors ${
                mode === "desktop"
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              桌機版
            </button>
            <button
              type="button"
              onClick={() => setMode("mobile")}
              className={`cursor-pointer px-3 py-1.5 transition-colors ${
                mode === "mobile"
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              手機版
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="關閉"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* iframe 區域 */}
        <div
          className={`flex flex-1 overflow-hidden bg-gray-100 ${
            mode === "mobile" ? "justify-center" : ""
          }`}
        >
          <iframe
            key={mode}
            src={previewUrl}
            title="前台行程預覽"
            className="h-full border-none"
            style={{
              width: mode === "desktop" ? "100%" : "390px",
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
