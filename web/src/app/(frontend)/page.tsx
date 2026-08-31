import type { Metadata } from "next";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import HeroCarousel from "@/components/frontend/HeroCarousel";
import CategoryList from "@/components/frontend/CategoryList";
import { HERO_FALLBACK_SLIDES } from "@/lib/frontend-data";
import { getRegionList } from "@/lib/frontend-queries";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

// Home reads hero banners / featured tours from the DB at request time and is the
// only non-parameterized frontend route that would otherwise be prerendered at
// build (where the `db` service is unreachable). The dynamic param routes under
// (frontend) are already rendered on demand, so we mark only this page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程",
  description: "找到了旅遊，精選日本、歐洲、東南亞等優質行程，由專業旅遊顧問為您量身打造。",
  openGraph: { url: "/" },
};

export default async function HomePage() {
  const [regions, dbBanners] = await Promise.all([
    getRegionList(),
    db.heroBanner.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const heroSlides =
    dbBanners.length > 0
      ? dbBanners.map((b) => ({ img: storage.publicUrl(b.imageKey), alt: b.title }))
      : HERO_FALLBACK_SLIDES;

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
      <SiteHeader />

      <HeroCarousel slides={heroSlides} />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <span className="cur">首頁</span>
          </span>
        </div>
      </nav>

      <CategoryList
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
