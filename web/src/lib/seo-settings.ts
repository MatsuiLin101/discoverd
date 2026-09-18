import { cache } from "react";
import { storage } from "@/lib/storage";
import { getSiteSettingCached } from "@/lib/site-setting";

/**
 * Site-wide SEO defaults.
 *
 * The admin "SEO 設定" page stores overrides on the SiteSetting singleton; when
 * a field is left blank the frontend falls back to the built-in defaults below.
 * `getSeoSettings` is wrapped in React `cache` so the layout metadata, the home
 * metadata and the JSON-LD all share a single DB read per request.
 */

export const DEFAULT_SITE_NAME = "找到了旅遊 FOUND HOLIDAY";
/** Short brand for per-page <title> suffixes (keeps titles from truncating). */
export const BRAND_SHORT = "找到了旅遊";
export const DEFAULT_TITLE = "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程";
export const DEFAULT_DESCRIPTION =
  "找到了旅遊，精選日本、歐洲、東南亞等優質行程，由專業旅遊顧問為您量身打造。";
/** Bundled fallback OG image (public/og-default.jpg), 1200×630. */
export const FALLBACK_OG_IMAGE = "/og-default.jpg";

export interface ResolvedSeoSettings {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  /** Absolute-or-relative URL of the default OG image (admin upload or bundled fallback). */
  ogImageUrl: string;
  /** Google Search Console verification token, or undefined when unset. */
  googleSiteVerification: string | undefined;
  /** Social profile URLs for JSON-LD sameAs (may contain falsy entries). */
  social: (string | null | undefined)[];
}

export const getSeoSettings = cache(async (): Promise<ResolvedSeoSettings> => {
  const s = await getSiteSettingCached();

  return {
    siteName: s?.seoSiteName || DEFAULT_SITE_NAME,
    defaultTitle: s?.seoDefaultTitle || DEFAULT_TITLE,
    defaultDescription: s?.seoDefaultDescription || DEFAULT_DESCRIPTION,
    ogImageUrl: s?.ogImageKey ? storage.publicUrl(s.ogImageKey) : FALLBACK_OG_IMAGE,
    googleSiteVerification: s?.googleSiteVerification || undefined,
    social: [s?.facebookUrl, s?.instagramUrl, s?.lineUrl],
  };
});
