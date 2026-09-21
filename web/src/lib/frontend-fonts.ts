import { Noto_Sans, Noto_Sans_TC } from "next/font/google";

/**
 * The public site's fonts, defined once and shared. Both the (frontend) layout
 * and the root not-found page render `.fh-root`, and each used to instantiate
 * these fonts independently — which made next/font emit the Noto Sans TC
 * @font-face manifest (~140 KiB of render-blocking CSS) twice. Importing a single
 * shared instance collapses that to one copy.
 */
export const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});
