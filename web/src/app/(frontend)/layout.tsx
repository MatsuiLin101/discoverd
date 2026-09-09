import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Noto_Sans, Noto_Sans_TC } from "next/font/google";
import { db } from "@/lib/db";
import "./frontend.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程",
  description: "找到了旅遊，精選日本、歐洲、東南亞等優質行程，由專業旅遊顧問為您量身打造。",
  openGraph: {
    siteName: "找到了旅遊 FOUND HOLIDAY",
    locale: "zh_TW",
    type: "website",
  },
};

// Read at request time so the boxed layout reflects the current setting. All
// (frontend) routes are already rendered on demand, so this adds no build-time
// DB access.
export const dynamic = "force-dynamic";

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setting = await db.siteSetting.findUnique({
    where: { id: "singleton" },
    select: { layoutMode: true, boxMaxWidth: true, boxOuterBackground: true },
  });
  const boxed = setting?.layoutMode === "boxed";
  const boxWidth = setting?.boxMaxWidth ?? 1320;
  const outerBg = setting?.boxOuterBackground ?? "neutral";

  const rootStyle = boxed
    ? ({ "--box": `${boxWidth}px`, "--max": `${boxWidth}px` } as CSSProperties)
    : undefined;

  return (
    <div className="fh-outer" data-bg={boxed ? outerBg : undefined}>
      <div
        className={`${notoSans.variable} ${notoSansTC.variable} fh-root`}
        data-layout={boxed ? "boxed" : undefined}
        style={rootStyle}
      >
        {children}
      </div>
    </div>
  );
}
