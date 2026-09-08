"use client";

import { useState, FormEvent } from "react";

const MODE_OPTIONS = [
  { value: "original", label: "原顯示方式（桌機滿版、手機依比例）" },
  { value: "fit", label: "符合圖片比例（滿寬、限制最大高度）" },
];

const RATIO_OPTIONS = [
  { value: "cover", label: "滿版（會裁切左右／上下）" },
  { value: "2/1", label: "2 : 1（完整顯示，無留白）" },
  { value: "4/3", label: "4 : 3（完整顯示，上下微留白）" },
  { value: "1/1", label: "1 : 1（完整顯示，上下留白）" },
];

const selectClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 sm:max-w-xs";
const ringStyle = { ["--tw-ring-color" as string]: "#D12351" };

export default function HeroDisplaySetting({
  initialMode,
  initialMaxHeight,
  initialRatio,
}: {
  initialMode: string;
  initialMaxHeight: number;
  initialRatio: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [maxHeight, setMaxHeight] = useState(String(initialMaxHeight));
  const [ratio, setRatio] = useState(initialRatio);

  const [saved, setSaved] = useState({
    mode: initialMode,
    maxHeight: String(initialMaxHeight),
    ratio: initialRatio,
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = mode !== saved.mode || maxHeight !== saved.maxHeight || ratio !== saved.ratio;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const h = Number(maxHeight);
    if (!Number.isInteger(h) || h < 200 || h > 2000) {
      setError("最大高度請輸入 200 ～ 2000 之間的整數");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/admin/hero-banners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroDisplayMode: mode, heroMaxHeight: h, mobileHeroRatio: ratio }),
      });
      const data = await res.json();
      if (data.data) {
        setSaved({ mode, maxHeight, ratio });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-gray-800">輪播圖顯示設定</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        <div>
          <label htmlFor="heroDisplayMode" className="mb-1 block text-sm font-medium text-gray-700">
            顯示方式
          </label>
          <select
            id="heroDisplayMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={selectClass}
            style={ringStyle}
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "original" ? (
          <div>
            <label htmlFor="mobileHeroRatio" className="mb-1 block text-sm font-medium text-gray-700">
              手機版輪播圖比例
            </label>
            <select
              id="mobileHeroRatio"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className={selectClass}
              style={ringStyle}
            >
              {RATIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              桌機版維持滿版呈現。此設定只作用於手機版（螢幕寬度 768px 以下）。「滿版」會裁切圖片邊緣；其他比例會完整顯示整張圖，不足處以深色留白補滿。
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="heroMaxHeight" className="mb-1 block text-sm font-medium text-gray-700">
              最大高度（px）
            </label>
            <div className="flex items-center gap-2">
              <input
                id="heroMaxHeight"
                type="number"
                min={200}
                max={2000}
                step={10}
                value={maxHeight}
                onChange={(e) => setMaxHeight(e.target.value)}
                className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
                style={ringStyle}
              />
              <span className="text-sm text-gray-500">px</span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              桌機與手機一致：圖片以滿寬（100%）呈現並維持原始比例，高度不超過此上限；超過時以深色底完整顯示、不裁切。建議原圖 2560 × 1280（2:1）、重點置中。
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !dirty}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            {isPending ? "儲存中…" : "儲存設定"}
          </button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">已成功儲存</p>}
        </div>
      </form>
    </div>
  );
}
