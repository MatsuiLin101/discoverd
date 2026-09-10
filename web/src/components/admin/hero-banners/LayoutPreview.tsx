"use client";

import type { CSSProperties } from "react";

// A schematic, scaled-down mock of the front page that reflects the current
// layout settings. Not pixel-perfect — it conveys mode / ratio / height / box
// width / outer background at a glance.

const SITE_GRADIENT = "linear-gradient(180deg,#FFECEF 0%,#F2E8F4 46%,#E0E0FF 100%)";
const OUTER_BG: Record<string, string> = {
  neutral: "#EAE7F0",
  dark: "#1F1A24",
  gradient: SITE_GRADIENT,
};
const SAMPLE = "/images/hero/hero-1.jpg"; // 1200 x 800 (3:2)
const SAMPLE_RATIO = 1.5;

// Virtual desktop viewport mapped to the fixed preview width. A wide virtual
// viewport (1600) keeps the boxed margins visible for typical box widths.
const SCREEN_W = 340;
const VW = 1600;
const SCALE = SCREEN_W / VW;

function parseRatio(r: string): number | null {
  if (r === "auto") return null;
  const [w, h] = r.split("/").map(Number);
  return w && h ? w / h : null;
}

function Header({ line = "rgba(42,34,51,0.12)" }: { line?: string }) {
  return (
    <div
      style={{
        height: 24,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "0 10px",
        background: "rgba(255,236,239,0.85)",
        borderBottom: `1px solid ${line}`,
      }}
    >
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#E0506B" }} />
      <div style={{ width: 34, height: 5, borderRadius: 3, background: "rgba(42,34,51,0.4)" }} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 14, height: 5, borderRadius: 3, background: "rgba(42,34,51,0.2)" }} />
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
          <div key={i} style={{ flex: 1, height: 30, borderRadius: 4, background: "rgba(42,34,51,0.12)" }} />
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
  const isRatio = mode === "fit" || mode === "boxed";
  const ratio = parseRatio(heroRatio) ?? SAMPLE_RATIO;
  const cap = Math.round(maxHeight * SCALE);
  const boxW = mode === "boxed" ? Math.round(Math.min(boxWidth, VW) * SCALE) : SCREEN_W;

  // Carousel height: ratio modes derive it from width÷ratio capped at maxHeight;
  // original represents the desktop full-bleed cover with a fixed tall band.
  const carH = isRatio ? Math.min(Math.round(boxW / ratio), cap) : 118;

  const carousel = (
    <div style={{ height: carH, background: "#1F1A24", position: "relative", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SAMPLE}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: isRatio ? "contain" : "cover", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 5,
          right: 6,
          display: "flex",
          gap: 3,
        }}
      >
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

  const screenStyle: CSSProperties = {
    width: SCREEN_W,
    maxWidth: "100%",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(42,34,51,0.15)",
    background: mode === "boxed" ? OUTER_BG[outerBg] ?? OUTER_BG.neutral : "#fff",
  };

  const caption =
    mode === "original"
      ? `原顯示方式・桌機滿版、手機比例 ${mobileRatio === "cover" ? "滿版" : mobileRatio}`
      : mode === "fit"
        ? `符合比例・${heroRatio === "auto" ? "依原圖" : heroRatio}、最高 ${maxHeight}px`
        : `盒裝 ${boxWidth}px・${heroRatio === "auto" ? "依原圖" : heroRatio}、最高 ${maxHeight}px`;

  return (
    <div className="lg:sticky lg:top-4">
      <p className="mb-2 text-sm font-medium text-gray-700">即時預覽</p>
      <div style={screenStyle}>
        {mode === "boxed" ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: boxW }}>{page}</div>
          </div>
        ) : (
          page
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">{caption}</p>
      <p className="mt-0.5 text-xs text-gray-400">示意用途，實際顯示依螢幕寬度與圖片而定。</p>
    </div>
  );
}
