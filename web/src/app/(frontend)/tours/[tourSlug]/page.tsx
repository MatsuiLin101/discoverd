import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import TourDetailActions from "@/components/frontend/TourDetailActions";
import TourShareButton from "@/components/frontend/TourShareButton";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { toTourMedia } from "@/lib/frontend-queries";
import TourMediaGallery from "@/components/frontend/TourMediaGallery";

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

  const tour = await db.tour.findFirst({
    where: { published: true, OR: [{ productId: tourSlug }, { slug: tourSlug }] },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      productId: true,
      slug: true,
      thumbnailKey: true,
      tags: {
        select: { name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      files: {
        orderBy: { sortOrder: "asc" },
        select: { key: true, mimeType: true, filename: true },
      },
      subRegion: {
        select: {
          name: true,
          slug: true,
          region: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!tour) notFound();

  const media = tour.files.map(toTourMedia);
  const thumbnail = urlOf(tour.thumbnailKey);

  const regionSlug = tour.subRegion.region.slug;
  const subSlug = tour.subRegion.slug;

  return (
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${regionSlug}`}>{tour.subRegion.region.name}</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${regionSlug}/${subSlug}`}>{tour.subRegion.name}</Link>
            <span className="sep">／</span>
            <span className="cur">{tour.name}</span>
          </span>
        </div>
      </nav>

      <section className="fh-tour-detail">
        <div className="fh-modal">
          <TourMediaGallery media={media} thumbnail={thumbnail} alt={tour.name} />

          <aside className="fh-modal-side">
            <div className="m-top">
              <div className="m-eyebrow">
                {tour.subRegion.region.name} ・ {tour.subRegion.name}
              </div>
              <div className="m-name-row">
                <h1 className="m-name">{tour.name}</h1>
                <TourShareButton urlId={tour.productId ?? tour.slug} />
              </div>
              <div className="m-tags">
                {tour.tags.map((t) => (
                  <span key={t.name}>{t.name === "hot" ? "熱門" : t.name}</span>
                ))}
              </div>
              {tour.description && <p className="m-lede">{tour.description}</p>}
            </div>

            <div className="m-bottom">
              <div>
                <div className="m-price">
                  <span className="cur">NT$</span>
                  <span className="num">{tour.price.toLocaleString("zh-TW")}</span>
                  <span className="unit">起</span>
                </div>
                <p className="m-note">※ 優惠方案及出發日期請洽服務專員</p>
              </div>
              <TourDetailActions tourId={tour.id} tourName={tour.name} />
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
