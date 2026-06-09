import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import TourDetailActions from "@/components/frontend/TourDetailActions";
import TourShareButton from "@/components/frontend/TourShareButton";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ tourSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tourSlug } = await params;
  const tour = await db.tour.findUnique({
    where: { slug: tourSlug, published: true },
    select: {
      name: true,
      description: true,
      thumbnail: true,
      seoTitle: true,
      seoDescription: true,
      ogImage: true,
      files: {
        where: { mimeType: { startsWith: "image/" } },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
        take: 1,
      },
    },
  });
  if (!tour) return {};
  const ogImageUrl = tour.ogImage ?? tour.thumbnail ?? tour.files[0]?.url;
  return {
    title: tour.seoTitle ?? `${tour.name} ／ 找到了旅遊 FOUND HOLIDAY`,
    description: tour.seoDescription ?? tour.description?.slice(0, 150) ?? undefined,
    openGraph: {
      url: `/tours/${tourSlug}`,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  };
}

export default async function TourPage({ params }: Props) {
  const { tourSlug } = await params;

  const tour = await db.tour.findUnique({
    where: { slug: tourSlug, published: true },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      thumbnail: true,
      tags: {
        select: { name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      files: {
        where: { mimeType: { startsWith: "image/" } },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
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

  const images =
    tour.files.length > 0
      ? tour.files.map((f) => f.url)
      : tour.thumbnail
        ? [tour.thumbnail]
        : [];

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
          <div className="fh-modal-gallery">
            <div className="fh-gallery-scroll">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={tour.name} />
              ))}
            </div>
          </div>

          <aside className="fh-modal-side">
            <div className="m-top">
              <div className="m-eyebrow">
                {tour.subRegion.region.name} ・ {tour.subRegion.name}
              </div>
              <div className="m-name-row">
                <h1 className="m-name">{tour.name}</h1>
                <TourShareButton slug={tourSlug} />
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
