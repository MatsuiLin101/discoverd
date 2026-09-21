import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import CategoryList from "@/components/frontend/CategoryList";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { getRegionDetail } from "@/lib/frontend-queries";
import { getSocialLinks } from "@/lib/site-setting";
import { metaDescription } from "@/lib/seo-text";
import { getSeoSettings, BRAND_SHORT } from "@/lib/seo-settings";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegionDetail(slug);
  if (!region) return {};
  const seo = await getSeoSettings();
  const ogImageUrl = region.ogImage ?? region.thumbnail ?? seo.ogImageUrl;
  return {
    title: region.seoTitle ?? `${region.name}｜${BRAND_SHORT}`,
    description: metaDescription(region.seoDescription, {
      fallback: `探索 ${region.name} 系列旅程，精選優質行程，找到了旅遊為您規劃最適合的路線。`,
    }),
    alternates: { canonical: `/regions/${slug}` },
    openGraph: {
      url: `/regions/${slug}`,
      images: [ogImageUrl],
    },
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = await getRegionDetail(slug);
  if (!region) notFound();

  const social = await getSocialLinks();

  const subCategories = region.subRegions.map((sr) => ({
    href: `/regions/${slug}/${sr.slug}`,
    name: sr.name,
    count: sr.tourCount,
    img: sr.thumbnail ?? "",
    crop: sr.thumbnail ? sr.crop : null,
  }));

  const totalTours = region.subRegions.reduce((sum, sr) => sum + sr.tourCount, 0);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "首頁", path: "/" },
          { name: region.name, path: `/regions/${slug}` },
        ])}
      />
      <SiteHeader social={social} />

      <main>
        <nav className="fh-page-bar">
          <div className="fh-page-bar-inner">
            <span className="crumb">
              <Link href="/">首頁</Link>
              <span className="sep">／</span>
              <span className="cur">{region.name}</span>
            </span>
          </div>
        </nav>

        <CategoryList
          headingLevel="h1"
          title={`<span class="ph" style="color: var(--accent);">縮小範圍</span> <span class="ph">遇見最適合你的旅程</span>`}
          stats={[
            `<b>${region.subRegions.length}</b> 個選擇`,
            `共 <b>${totalTours}</b> 條路線`,
          ]}
          categories={subCategories}
        />
      </main>

      <SiteFooter />
    </>
  );
}
