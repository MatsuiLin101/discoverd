"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import type { ThumbCrop } from "@/lib/crop";

interface Props {
  /** Original image URL or object URL to crop. */
  src: string;
  /** Fixed aspect ratio of the crop box (e.g. 4/3 or 16/9). */
  aspect: number;
  /** Existing crop to restore, or null to start centered. */
  value?: ThumbCrop | null;
  onApply: (crop: ThumbCrop) => void;
  onCancel: () => void;
}

/** Convert react-easy-crop's percentage Area (0..100) to a normalized crop. */
function toThumbCrop(area: Area): ThumbCrop {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  return {
    x: clamp01(area.x / 100),
    y: clamp01(area.y / 100),
    w: clamp01(area.width / 100),
    h: clamp01(area.height / 100),
  };
}

/** Restore a stored crop as react-easy-crop's initialCroppedAreaPercentages. */
function toInitialArea(crop: ThumbCrop | null | undefined): Area | undefined {
  if (!crop) return undefined;
  return { x: crop.x * 100, y: crop.y * 100, width: crop.w * 100, height: crop.h * 100 };
}

/**
 * Modal crop tool for a fixed-ratio thumbnail. Records only the crop rectangle
 * (normalized 0..1) — the original image is never re-compressed. The ratio is
 * fixed by the caller and cannot be changed here.
 */
export default function ImageCropper({ src, aspect, value, onApply, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<ThumbCrop | null>(value ?? null);

  const onCropComplete = useCallback((croppedArea: Area) => {
    setArea(toThumbCrop(croppedArea));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-medium text-gray-800">
            調整裁切範圍
            <span className="ml-2 text-xs font-normal text-gray-400">
              比例 {aspect === 4 / 3 ? "4:3" : aspect === 16 / 9 ? "16:9" : aspect.toFixed(2)}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="關閉"
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="relative h-72 w-full bg-gray-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            restrictPosition
            initialCroppedAreaPercentages={toInitialArea(value)}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3">
          <span className="text-xs text-gray-500">縮放</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#D12351]"
            aria-label="縮放"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => area && onApply(area)}
            disabled={!area}
            className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            套用
          </button>
        </div>
      </div>
    </div>
  );
}
