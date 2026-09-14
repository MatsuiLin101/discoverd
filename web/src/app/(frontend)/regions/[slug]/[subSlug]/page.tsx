import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubRegionListing from "@/components/frontend/SubRegionListing";
import { getRegionTours } from "@/lib/frontend-queries";

interface Props {
  params: Promise<{ slug: string; subSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const data = await getRegionTours(slug);
  if (!data) return {};
  const sub = data.subRegions.find((sr) => sr.slug === subSlug);
  if (!sub) return {};
  return {
    title: sub.seoTitle ?? `${sub.name} ／ ${data.region.name} — 找到了旅遊 FOUND HOLIDAY`,
    description: sub.seoDescription ?? `${sub.name} 旅程精選，共 ${sub.tours.length} 條路線，找到了旅遊為您推薦。`,
    openGraph: {
      url: `/regions/${slug}/${subSlug}`,
      images: sub.ogImage ? [sub.ogImage] : [],
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
    <SubRegionListing
      data={data}
      regionSlug={slug}
      activeSlug={validSlug}
      activeName={currentSub.name}
    />
  );
}
