"use client";

import { useState, FormEvent } from "react";

const MODE_OPTIONS = [
  { value: "original", label: "原顯示方式（滿版・桌機輪播滿版、手機依比例）" },
  { value: "fit", label: "符合比例（滿版・輪播依比例、限制最大高度）" },
  { value: "boxed", label: "盒裝限寬（整站置中於最大寬度・輪播依比例）" },
];

const RATIO_OPTIONS = [
  { value: "cover", label: "滿版（會裁切左右／上下）" },
  { value: "2/1", label: "2 : 1（完整顯示，無留白）" },
  { value: "4/3", label: "4 : 3（完整顯示，上下微留白）" },
  { value: "1/1", label: "1 : 1（完整顯示，上下留白）" },
];

const HERO_RATIO_OPTIONS = [
  { value: "auto", label: "依原圖比例（量測第一張圖）" },
  { value: "2/1", label: "2 : 1（寬幅）" },
  { value: "16/9", label: "16 : 9（寬螢幕）" },
  { value: "3/2", label: "3 : 2" },
  { value: "4/3", label: "4 : 3" },
  { value: "1/1", label: "1 : 1（方形）" },
];

const OUTER_BG_OPTIONS = [
  { value: "neutral", label: "中性淡色（近白灰底）" },
  { value: "gradient", label: "延伸盒內漸層（粉→紫）" },
  { value: "dark", label: "深色底" },
];

// Suggested source image size per carousel ratio (long edge ~2560px so it
// stays sharp on wide / retina screens).
const HERO_RATIO_RECOMMEND: Record<string, string> = {
  auto: "長邊 ≥ 2560px、比例接近你的圖片，重點置中",
  "2/1": "2560 × 1280 px",
  "16/9": "2560 × 1440 px",
  "3/2": "2400 × 1600 px",
  "4/3": "2400 × 1800 px",
  "1/1": "2000 × 2000 px",
};

// Schema defaults, surfaced as a hint next to each editable px field.
const DEFAULT_MAX_HEIGHT = 720;
const DEFAULT_BOX_WIDTH = 1320;

const controlClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 sm:max-w-md";
const numberClass =
  "block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2";
const ringStyle = { ["--tw-ring-color" as string]: "#D12351" };

export default function LayoutSetting({
  initialMode,
  initialPauseOnHover,
  initialMaxHeight,
  initialHeroRatio,
  initialBoxWidth,
  initialOuterBg,
  initialRatio,
}: {
  initialMode: string;
  initialPauseOnHover: boolean;
  initialMaxHeight: number;
  initialHeroRatio: string;
  initialBoxWidth: number;
  initialOuterBg: string;
  initialRatio: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [pauseOnHover, setPauseOnHover] = useState(initialPauseOnHover);
  const [maxHeight, setMaxHeight] = useState(String(initialMaxHeight));
  const [heroRatio, setHeroRatio] = useState(initialHeroRatio);
  const [boxWidth, setBoxWidth] = useState(String(initialBoxWidth));
  const [outerBg, setOuterBg] = useState(initialOuterBg);
  const [ratio, setRatio] = useState(initialRatio);

  const [saved, setSaved] = useState({
    mode: initialMode,
    pauseOnHover: initialPauseOnHover,
    maxHeight: String(initialMaxHeight),
    heroRatio: initialHeroRatio,
    boxWidth: String(initialBoxWidth),
    outerBg: initialOuterBg,
    ratio: initialRatio,
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty =
    mode !== saved.mode ||
    pauseOnHover !== saved.pauseOnHover ||
    maxHeight !== saved.maxHeight ||
    heroRatio !== saved.heroRatio ||
    boxWidth !== saved.boxWidth ||
    outerBg !== saved.outerBg ||
    ratio !== saved.ratio;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const h = Number(maxHeight);
    if ((mode === "fit" || mode === "boxed") && (!Number.isInteger(h) || h < 200 || h > 2000)) {
      setError("最大高度請輸入 200 ～ 2000 之間的整數");
      return;
    }
    const w = Number(boxWidth);
    if (mode === "boxed" && (!Number.isInteger(w) || w < 768 || w > 2560)) {
      setError("盒寬請輸入 768 ～ 2560 之間的整數");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/admin/hero-banners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layoutMode: mode,
          heroPauseOnHover: pauseOnHover,
          heroMaxHeight: h,
          heroRatio,
          boxMaxWidth: w,
          boxOuterBackground: outerBg,
          mobileHeroRatio: ratio,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setSaved({ mode, pauseOnHover, maxHeight, heroRatio, boxWidth, outerBg, ratio });
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

  // Shared by the "fit" and "boxed" branches: the carousel aspect ratio.
  const heroRatioField = (
    <div>
      <label htmlFor="heroRatio" className="mb-1 block text-sm font-medium text-gray-700">
        輪播圖比例
      </label>
      <select
        id="heroRatio"
        value={heroRatio}
        onChange={(e) => setHeroRatio(e.target.value)}
        className={controlClass}
        style={ringStyle}
      >
        {HERO_RATIO_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-gray-500">
        「依原圖比例」用第一張圖的原始比例縮放；選固定比例時，輪播圖以該比例呈現，圖片在框內完整置中、不足處以深色留白。
      </p>
      <p className="mt-1 text-xs text-gray-400">
        建議原圖尺寸：{HERO_RATIO_RECOMMEND[heroRatio] ?? HERO_RATIO_RECOMMEND.auto}
      </p>
    </div>
  );

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-gray-800">全站版面設定</h2>
      <p className="mt-1 text-sm text-gray-500">
        控制整站（header、內容、footer）與首頁輪播圖的呈現方式。
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        <div>
          <label htmlFor="layoutMode" className="mb-1 block text-sm font-medium text-gray-700">
            版面模式
          </label>
          <select
            id="layoutMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={controlClass}
            style={ringStyle}
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "original" && (
          <div>
            <label htmlFor="mobileHeroRatio" className="mb-1 block text-sm font-medium text-gray-700">
              手機版輪播圖比例
            </label>
            <select
              id="mobileHeroRatio"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className={controlClass}
              style={ringStyle}
            >
              {RATIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              桌機維持滿版。此設定只作用於手機版（螢幕寬度 768px 以下）。「滿版」會裁切邊緣；其他比例完整顯示整張圖，不足處以深色留白補滿。
            </p>
            <p className="mt-1 text-xs text-gray-400">
              建議原圖：2560 × 1280 px（2:1）以上的橫幅、重點置中（桌機滿版會裁切邊緣）。
            </p>
          </div>
        )}

        {mode === "fit" && (
          <>
            {heroRatioField}
            <div>
              <label htmlFor="heroMaxHeight" className="mb-1 block text-sm font-medium text-gray-700">
                輪播圖最大高度（px）
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="heroMaxHeight"
                  type="number"
                  min={200}
                  max={2000}
                  step={1}
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className={numberClass}
                  style={ringStyle}
                />
                <span className="text-sm text-gray-500">px</span>
                <span className="text-xs text-gray-400">預設 {DEFAULT_MAX_HEIGHT}</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                桌機與手機一致：輪播圖以滿寬呈現，高度不超過此上限；超過時以深色底完整顯示、不裁切。建議原圖尺寸見上方「輪播圖比例」。
                <br />
                實際高度為「寬度 ÷ 比例」與此上限的較小者：比例較高時，寬螢幕會以此上限為準（輪播圖變扁、圖片左右留白）。
              </p>
            </div>
          </>
        )}

        {mode === "boxed" && (
          <>
            <div>
              <label htmlFor="boxMaxWidth" className="mb-1 block text-sm font-medium text-gray-700">
                盒子最大寬度（px）
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="boxMaxWidth"
                  type="number"
                  min={768}
                  max={2560}
                  step={1}
                  value={boxWidth}
                  onChange={(e) => setBoxWidth(e.target.value)}
                  className={numberClass}
                  style={ringStyle}
                />
                <span className="text-sm text-gray-500">px</span>
                <span className="text-xs text-gray-400">預設 {DEFAULT_BOX_WIDTH}</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                整站內容（header、內容、footer）置中限制在此寬度內；輪播圖在盒內依下方比例縮放。
              </p>
            </div>
            {heroRatioField}
            <div>
              <label
                htmlFor="boxedHeroMaxHeight"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                輪播圖最大高度（px）
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="boxedHeroMaxHeight"
                  type="number"
                  min={200}
                  max={2000}
                  step={1}
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className={numberClass}
                  style={ringStyle}
                />
                <span className="text-sm text-gray-500">px</span>
                <span className="text-xs text-gray-400">預設 {DEFAULT_MAX_HEIGHT}</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                輪播圖在盒內的高度上限；超過時以深色底完整顯示、不裁切。
                <br />
                實際高度為「盒寬 ÷ 比例」與此上限的較小者：比例較高時會以此上限為準（輪播圖變扁、圖片左右留白）。
              </p>
            </div>
            <div>
              <label
                htmlFor="boxOuterBackground"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                盒外背景
              </label>
              <select
                id="boxOuterBackground"
                value={outerBg}
                onChange={(e) => setOuterBg(e.target.value)}
                className={controlClass}
                style={ringStyle}
              >
                {OUTER_BG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                寬螢幕時盒子左右露出的區域顏色。
              </p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="heroPauseOnHover" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              id="heroPauseOnHover"
              type="checkbox"
              checked={pauseOnHover}
              onChange={(e) => setPauseOnHover(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              style={{ accentColor: "#D12351" }}
            />
            滑鼠懸浮時暫停自動輪播
          </label>
          <p className="mt-1.5 text-xs text-gray-500">
            開啟時，滑鼠移到輪播圖上會暫停自動切換、移開後恢復。關閉則懸浮時仍持續自動輪播。（鍵盤 focus 為維持無障礙一律會暫停。）
          </p>
        </div>

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
