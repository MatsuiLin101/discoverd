import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_TC } from "next/font/google";
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
  title: "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程",
  description: "找到了旅遊，精選日本、歐洲、東南亞等優質行程，由專業旅遊顧問為您量身打造。",
};

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${notoSans.variable} ${notoSansTC.variable} fh-root`}>
      {children}
    </div>
  );
}
