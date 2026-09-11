import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import TourDetailCard from "@/components/frontend/TourDetailCard";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getTourDetail } from "@/lib/frontend-queries";

interface Props {
  params: Promise<{ tourSlug: string }>;
}

const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourSlug } = await params;
  const tour = await db.tour.findFirst({
    where: { published: true, OR: [{ productId: tourSlug }, { slug: tourSlug }] },
    select: {
      name: true,
      description: true,
      productId: true,
      slug: true,
      thumbnailKey: true,
      seoTitle: true,
      seoDescription: true,
      ogImageKey: true,
      files: {
        where: { mimeType: { startsWith: "image/" } },
        orderBy: { sortOrder: "asc" },
        select: { key: true },
        take: 1,
      },
    },
  });
  if (!tour) return {};
  const ogImageUrl = urlOf(tour.ogImageKey) ?? urlOf(tour.thumbnailKey) ?? (tour.files[0] ? storage.publicUrl(tour.files[0].key) : undefined);
  // Canonical URL uses the ProductID (falls back to slug when not yet assigned),
  // so old random-string links stay valid but point search engines at the new URL.
  const canonicalPath = `/tours/${tour.productId ?? tour.slug}`;
  return {
    title: tour.seoTitle ?? `${tour.name} ／ 找到了旅遊 FOUND HOLIDAY`,
    description: tour.seoDescription ?? tour.description?.slice(0, 150) ?? undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      url: canonicalPath,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  };
}

export default async function TourPage({ params }: Props) {
  const { tourSlug } = await params;

  const tour = await getTourDetail(tourSlug);
  if (!tour) notFound();

  return (
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${tour.regionSlug}`}>{tour.regionName}</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${tour.regionSlug}/${tour.subSlug}`}>{tour.subRegionName}</Link>
            <span className="sep">／</span>
            <span className="cur">{tour.name}</span>
          </span>
        </div>
      </nav>

      <section className="fh-tour-detail">
        <div className="fh-modal">
          <TourDetailCard tour={tour} headingTag="h1" />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
