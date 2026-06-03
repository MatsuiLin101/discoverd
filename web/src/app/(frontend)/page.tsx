import type { Metadata } from "next";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import HeroCarousel from "@/components/frontend/HeroCarousel";
import CategoryList from "@/components/frontend/CategoryList";
import { HERO_SLIDES } from "@/lib/frontend-data";
import { getRegionList } from "@/lib/frontend-queries";

export const metadata: Metadata = {
  title: "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程",
};

export default async function HomePage() {
  const regions = await getRegionList();

  const HOME_CATEGORIES = regions.map((r) => ({
    href: `/regions/${r.slug}`,
    name: r.name,
    count: r.tourCount,
    img: r.thumbnail ?? "",
  }));

  const totalTours = regions.reduce((sum, r) => sum + r.tourCount, 0);

  return (
    <>
      <SiteHeader />

      <HeroCarousel slides={HERO_SLIDES} />

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
