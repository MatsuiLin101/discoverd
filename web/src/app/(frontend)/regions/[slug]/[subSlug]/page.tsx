import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import TourSection from "@/components/frontend/TourSection";
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
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${slug}`}>{data.region.name}</Link>
            <span className="sep">／</span>
            <span className="cur">{currentSub.name}</span>
          </span>
        </div>
      </nav>

      <section className="fh-listing">
        <Suspense fallback={null}>
          <TourSection
            parent={{ name: data.region.name }}
            regionSlug={slug}
            regions={data.subRegions}
            initialSlug={validSlug}
          />
        </Suspense>
      </section>

      <SiteFooter />
    </>
  );
}
