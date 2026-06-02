import type { Metadata } from "next";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import HeroCarousel from "@/components/frontend/HeroCarousel";
import CategoryList from "@/components/frontend/CategoryList";
import { HERO_SLIDES, REGIONS } from "@/lib/frontend-data";

export const metadata: Metadata = {
  title: "找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程",
};

const HOME_CATEGORIES = REGIONS.map((r) => ({
  href: `/regions/${r.slug}`,
  zh: r.zh,
  en: r.en,
  count: r.count,
  img: r.img,
}));

const totalTours = REGIONS.reduce(
  (sum, r) => sum + r.subRegions.reduce((s, sr) => s + sr.tours.length, 0),
  0
);

export default function HomePage() {
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
          `<b>${REGIONS.length}</b> 個系列`,
          `共 <b>${totalTours}</b> 條路線`,
        ]}
        categories={HOME_CATEGORIES}
      />

      <SiteFooter />
    </>
  );
}
