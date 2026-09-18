import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Noto_Sans, Noto_Sans_TC } from "next/font/google";
import { db } from "@/lib/db";
import { GTMNoScript, GTMScript } from "@/components/analytics/GoogleTagManager";
import ContactClickTracker from "@/components/analytics/ContactClickTracker";
import JsonLd from "@/components/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import { getSeoSettings } from "@/lib/seo-settings";
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

// Metadata is built at request time from the SEO settings (admin-editable, with
// built-in fallbacks). Defaults declared here — the default OG image, the
// site-wide title/description and the Google verification token — are inherited
// by any page that does not redefine them. Note openGraph is shallowly merged:
// a page that sets its own `openGraph` replaces this one entirely, so pages that
// need the default image (e.g. the home page) must include it themselves.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    openGraph: {
      siteName: seo.siteName,
      locale: "zh_TW",
      type: "website",
      images: [seo.ogImageUrl],
    },
    // Only the card type is set site-wide; Next.js fills twitter:title,
    // twitter:description and twitter:image from each page's title, description
    // and OpenGraph image, so per-page cards stay specific.
    twitter: {
      card: "summary_large_image",
    },
    ...(seo.googleSiteVerification
      ? { verification: { google: seo.googleSiteVerification } }
      : {}),
  };
}

// Google Tag Manager is loaded only for the public (frontend) routes so that
// admin activity is not tracked. GA is configured inside the GTM container.
const gtmId = process.env.NEXT_PUBLIC_GTM_ID || undefined;

// Read at request time so the boxed layout reflects the current setting. All
// (frontend) routes are already rendered on demand, so this adds no build-time
// DB access.
export const dynamic = "force-dynamic";

export default async function FrontendLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const [setting, seo] = await Promise.all([
    db.siteSetting.findUnique({
      where: { id: "singleton" },
      select: {
        layoutMode: true,
        boxMaxWidth: true,
        boxOuterBackground: true,
      },
    }),
    getSeoSettings(),
  ]);
  const boxed = setting?.layoutMode === "boxed";
  const boxWidth = setting?.boxMaxWidth ?? 1280;
  const outerBg = setting?.boxOuterBackground ?? "neutral";

  const rootStyle = boxed
    ? ({ "--box": `${boxWidth}px`, "--max": `${boxWidth}px` } as CSSProperties)
    : undefined;

  return (
    <div className="fh-outer" data-bg={boxed ? outerBg : undefined}>
      <JsonLd
        data={[
          organizationSchema({ social: seo.social, name: seo.siteName }),
          websiteSchema(seo.siteName),
        ]}
      />
      {gtmId && <GTMScript gtmId={gtmId} />}
      {gtmId && <GTMNoScript gtmId={gtmId} />}
      {gtmId && <ContactClickTracker />}
      <div
        className={`${notoSans.variable} ${notoSansTC.variable} fh-root`}
        data-layout={boxed ? "boxed" : undefined}
        style={rootStyle}
      >
        {children}
        {modal}
      </div>
    </div>
  );
}
