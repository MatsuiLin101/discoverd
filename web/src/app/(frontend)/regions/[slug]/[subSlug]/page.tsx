import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubRegionListing from "@/components/frontend/SubRegionListing";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { getRegionTours } from "@/lib/frontend-queries";
import { metaDescription } from "@/lib/seo-text";
import { getSeoSettings, BRAND_SHORT } from "@/lib/seo-settings";

interface Props {
  params: Promise<{ slug: string; subSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const data = await getRegionTours(slug);
  if (!data) return {};
  const sub = data.subRegions.find((sr) => sr.slug === subSlug);
  if (!sub) return {};
  const seo = await getSeoSettings();
  const ogImageUrl = sub.ogImage ?? seo.ogImageUrl;
  return {
    title: sub.seoTitle ?? `${sub.name}｜${data.region.name}｜${BRAND_SHORT}`,
    description: metaDescription(sub.seoDescription, {
      fallback: `${sub.name} 旅程精選，共 ${sub.tours.length} 條路線，找到了旅遊為您推薦最適合的行程。`,
    }),
    alternates: { canonical: `/regions/${slug}/${subSlug}` },
    openGraph: {
      url: `/regions/${slug}/${subSlug}`,
      images: [ogImageUrl],
    },
  };
}

export default async function ToursPage({ params }: Props) {
  const { slug, subSlug } = await params;
  const data = await getRegionTours(slug);
  if (!data) notFound();

  const validSlug = data.subRegions.some((sr) => sr.slug === subSlug)
    ? subSlug
    : data.subRegions[0]?.slug ?? "";

  const currentSub = data.subRegions.find((sr) => sr.slug === validSlug);
  if (!currentSub) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "首頁", path: "/" },
          { name: data.region.name, path: `/regions/${slug}` },
          { name: currentSub.name, path: `/regions/${slug}/${validSlug}` },
        ])}
      />
      <SubRegionListing
        data={data}
        regionSlug={slug}
        activeSlug={validSlug}
        activeName={currentSub.name}
        headingLevel="h1"
      />
    </>
  );
}
