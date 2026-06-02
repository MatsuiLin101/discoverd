import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import HeroCarousel from "@/components/frontend/HeroCarousel";
import CategoryList from "@/components/frontend/CategoryList";
import { HERO_SLIDES, REGIONS } from "@/lib/frontend-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = REGIONS.find((r) => r.slug === slug);
  if (!region) return {};
  return {
    title: `${region.zh} ／ 找到了旅遊 FOUND HOLIDAY`,
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = REGIONS.find((r) => r.slug === slug);
  if (!region) notFound();

  const subCategories = region.subRegions.map((sr) => ({
    href: `/regions/${slug}/${sr.slug}`,
    zh: sr.zh,
    en: sr.en,
    count: String(sr.tours.length),
    img: sr.tours[0]?.img ?? region.img,
  }));

  const totalTours = region.subRegions.reduce((s, sr) => s + sr.tours.length, 0);

  return (
    <>
      <SiteHeader />

      <HeroCarousel slides={HERO_SLIDES} />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <span className="cur">{region.zh}</span>
          </span>
        </div>
      </nav>

      <CategoryList
        title={`<span class="ph" style="color: var(--accent);">縮小範圍</span> <span class="ph">遇見最適合你的旅程</span>`}
        stats={[
          `<b>${region.subRegions.length}</b> 個選擇`,
          `共 <b>${totalTours}</b> 條路線`,
        ]}
        categories={subCategories}
      />

      <SiteFooter />
    </>
  );
}
