import type { Metadata } from "next";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import HeroCarousel from "@/components/frontend/HeroCarousel";
import CategoryList from "@/components/frontend/CategoryList";
import { HERO_FALLBACK_SLIDES } from "@/lib/frontend-data";
import { getRegionList, getHeroBanners } from "@/lib/frontend-queries";
import { getSiteSettingCached } from "@/lib/site-setting";
import { getSeoSettings } from "@/lib/seo-settings";

// Home reads hero banners / featured tours from the DB at request time and is the
// only non-parameterized frontend route that would otherwise be prerendered at
// build (where the `db` service is unreachable). The dynamic param routes under
// (frontend) are already rendered on demand, so we mark only this page.
export const dynamic = "force-dynamic";

// The home page redefines openGraph (to set og:url), which shallowly replaces
// the layout's openGraph — so it must also re-declare the default OG image.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return {
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    alternates: { canonical: "/" },
    openGraph: { url: "/", siteName: seo.siteName, images: [seo.ogImageUrl] },
  };
}

export default async function HomePage() {
  const [regions, dbBanners, siteSetting] = await Promise.all([
    getRegionList(),
    getHeroBanners(),
    getSiteSettingCached(),
  ]);

  const heroSlides = dbBanners.length > 0 ? dbBanners : HERO_FALLBACK_SLIDES;

  const layoutMode = siteSetting?.layoutMode ?? "original";
  const heroPauseOnHover = siteSetting?.heroPauseOnHover ?? true;
  const heroMaxHeight = siteSetting?.heroMaxHeight ?? 720;
  const heroRatio = siteSetting?.heroRatio ?? "auto";
  const mobileHeroRatio = siteSetting?.mobileHeroRatio ?? "cover";

  const HOME_CATEGORIES = regions.map((r) => ({
    href: `/regions/${r.slug}`,
    name: r.name,
    count: r.tourCount,
    img: r.thumbnail ?? "",
    crop: r.thumbnail ? r.crop : null,
  }));

  const totalTours = regions.reduce((sum, r) => sum + r.tourCount, 0);

  return (
    <>
      <SiteHeader
        social={{
          facebookUrl: siteSetting?.facebookUrl ?? null,
          instagramUrl: siteSetting?.instagramUrl ?? null,
          lineUrl: siteSetting?.lineUrl ?? null,
          lineCommunityUrl: siteSetting?.lineCommunityUrl ?? null,
        }}
      />

      <HeroCarousel
        slides={heroSlides}
        mobileRatio={mobileHeroRatio}
        layoutMode={layoutMode}
        maxHeight={heroMaxHeight}
        heroRatio={heroRatio}
        pauseOnHover={heroPauseOnHover}
      />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <span className="cur">首頁</span>
          </span>
        </div>
      </nav>

      <CategoryList
        headingLevel="h1"
        title={`<em>挑一個方向</em> <span class="ph">開始你的下一段旅程</span>`}
        stats={[
          `<b>${regions.length}</b> 個系列`,
          `共 <b>${totalTours}</b> 條路線`,
        ]}
        categories={HOME_CATEGORIES}
      />

      <SiteFooter />
    </>
  );
}
