"use client";

import { useState, type CSSProperties } from "react";

// A schematic, scaled-down mock of the front page that reflects the current
// layout settings, previewable at desktop or mobile width. Not pixel-perfect —
// it conveys mode / ratio / height / box width / outer background at a glance.

const SITE_GRADIENT = "linear-gradient(180deg,#FFECEF 0%,#F2E8F4 46%,#E0E0FF 100%)";
const OUTER_BG: Record<string, string> = {
  neutral: "#EAE7F0",
  dark: "#1F1A24",
  gradient: SITE_GRADIENT,
};
const SAMPLE = "/images/hero/hero-1.jpg"; // 1200 x 800 (3:2)
const SAMPLE_RATIO = 1.5;

// Virtual viewport widths mapped to fixed preview widths.
const DESKTOP = { vw: 1600, screen: 340 };
const MOBILE = { vw: 390, screen: 190 };

function parseRatio(r: string): number | null {
  if (r === "auto") return null;
  const [w, h] = r.split("/").map(Number);
  return w && h ? w / h : null;
}

function Header() {
  return (
    <div
      style={{
        height: 24,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "0 10px",
        background: "rgba(255,236,239,0.85)",
        borderBottom: "1px solid rgba(42,34,51,0.12)",
      }}
    >
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#E0506B" }} />
      <div style={{ width: 34, height: 5, borderRadius: 3, background: "rgba(42,34,51,0.4)" }} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 12, height: 5, borderRadius: 3, background: "rgba(42,34,51,0.2)" }} />
        ))}
      </div>
    </div>
  );
}

function Content() {
  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ width: "45%", height: 7, borderRadius: 3, background: "rgba(42,34,51,0.28)" }} />
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 28, borderRadius: 4, background: "rgba(42,34,51,0.12)" }} />
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return <div style={{ height: 16, background: "#2A2233" }} />;
}

export default function LayoutPreview({
  mode,
  heroRatio,
  maxHeight,
  boxWidth,
  outerBg,
  mobileRatio,
}: {
  mode: string;
  heroRatio: string;
  maxHeight: number;
  boxWidth: number;
  outerBg: string;
  mobileRatio: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const isMobile = device === "mobile";
  const { vw, screen } = isMobile ? MOBILE : DESKTOP;
  const scale = screen / vw;
  const cap = Math.round(maxHeight * scale);

  // The box only narrows the site when it is smaller than the viewport, so on a
  // mobile viewport (< box width) the boxed layout fills the width like fit.
  const boxedNarrows = mode === "boxed" && boxWidth < vw;
  const contentW = boxedNarrows ? Math.round(boxWidth * scale) : screen;

  const ratio = parseRatio(heroRatio) ?? SAMPLE_RATIO;
  const mRatio = parseRatio(mobileRatio); // null when "cover"

  // Decide carousel fit + height for the current device.
  let objectFit: "cover" | "contain";
  let carH: number;
  if (isMobile && mode === "original") {
    if (mRatio) {
      objectFit = "contain";
      carH = Math.round(contentW / mRatio);
    } else {
      objectFit = "cover";
      carH = 150; // mobile full-bleed cover hero (tall)
    }
  } else if (mode === "original") {
    objectFit = "cover";
    carH = 118; // desktop full-bleed cover hero
  } else {
    objectFit = "contain";
    carH = Math.min(Math.round(contentW / ratio), cap);
  }

  const carousel = (
    <div style={{ height: carH, background: "#1F1A24", position: "relative", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SAMPLE} alt="" style={{ width: "100%", height: "100%", objectFit, display: "block" }} />
      <div style={{ position: "absolute", bottom: 5, right: 6, display: "flex", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === 0 ? 12 : 5,
              height: 3,
              borderRadius: 2,
              background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );

  const page = (
    <div style={{ background: SITE_GRADIENT }}>
      <Header />
      {carousel}
      <Content />
      <Footer />
    </div>
  );

  const frameStyle: CSSProperties = {
    width: screen,
    maxWidth: "100%",
    margin: isMobile ? "0 auto" : undefined,
    borderRadius: isMobile ? 18 : 8,
    overflow: "hidden",
    border: isMobile ? "5px solid #2A2233" : "1px solid rgba(42,34,51,0.15)",
    background: boxedNarrows ? OUTER_BG[outerBg] ?? OUTER_BG.neutral : "#fff",
  };

  const ratioLabel = heroRatio === "auto" ? "依原圖" : heroRatio;
  const caption =
    mode === "original"
      ? `原顯示方式・桌機滿版、手機比例 ${mRatio ? mobileRatio : "滿版"}`
      : mode === "fit"
        ? `符合比例・${ratioLabel}、最高 ${maxHeight}px`
        : `盒裝 ${boxWidth}px・${ratioLabel}、最高 ${maxHeight}px`;

  const tabBtn = (key: "desktop" | "mobile"): CSSProperties => ({
    padding: "3px 12px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid " + (device === key ? "#D12351" : "rgba(42,34,51,0.2)"),
    background: device === key ? "#D12351" : "#fff",
    color: device === key ? "#fff" : "#5A4F66",
    cursor: "pointer",
  });

  return (
    <div className="lg:sticky lg:top-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">即時預覽</p>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setDevice("desktop")} style={tabBtn("desktop")}>
            桌機
          </button>
          <button type="button" onClick={() => setDevice("mobile")} style={tabBtn("mobile")}>
            手機
          </button>
        </div>
      </div>
      <div style={frameStyle}>
        {boxedNarrows ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: contentW }}>{page}</div>
          </div>
        ) : (
          page
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">{caption}</p>
      <p className="mt-0.5 text-xs text-gray-400">
        {isMobile ? `手機檢視（約 ${vw}px 寬）` : `桌機檢視（約 ${vw}px 寬）`}
        ；示意用途，實際依螢幕與圖片而定。
      </p>
    </div>
  );
}
