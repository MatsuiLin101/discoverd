import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS, CACHE_BACKSTOP } from "@/lib/cache-tags";

/**
 * The SiteSetting singleton fields the public frontend needs (social links,
 * layout, SEO defaults) — deliberately excluding secrets like the AI keys so
 * they never enter the data cache. Cached under the `site-setting` tag and
 * revalidated when the admin saves social / layout / SEO settings.
 */
export const getSiteSettingCached = unstable_cache(
  async () => {
    return db.siteSetting.findUnique({
      where: { id: "singleton" },
      select: {
        // social (footer + JSON-LD sameAs)
        facebookUrl: true,
        instagramUrl: true,
        lineUrl: true,
        lineCommunityUrl: true,
        // layout (frontend layout + home hero)
        layoutMode: true,
        boxMaxWidth: true,
        boxOuterBackground: true,
        heroPauseOnHover: true,
        heroMaxHeight: true,
        heroRatio: true,
        mobileHeroRatio: true,
        // SEO defaults
        seoSiteName: true,
        seoDefaultTitle: true,
        seoDefaultDescription: true,
        ogImageKey: true,
        googleSiteVerification: true,
        showRelatedTours: true,
        orgTelephone: true,
        orgAddress: true,
        orgPriceRange: true,
      },
    });
  },
  ["getSiteSettingCached"],
  { tags: [CACHE_TAGS.siteSetting], revalidate: CACHE_BACKSTOP },
);

export type CachedSiteSetting = Awaited<ReturnType<typeof getSiteSettingCached>>;
