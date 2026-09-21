import { Geist, Geist_Mono } from "next/font/google";

/**
 * Geist is the admin panel's UI font (wired up as Tailwind's `--font-sans` /
 * `--font-mono` in admin.css). It lives here — imported only by the admin
 * layouts — so its font files and preload hints never ship on the public
 * (frontend) pages, which use Noto Sans / Noto Sans TC instead.
 */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
