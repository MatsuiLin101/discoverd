import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubRegionListing from "@/components/frontend/SubRegionListing";
import TourModalShell from "@/components/frontend/TourModalShell";
import TourDetailCard from "@/components/frontend/TourDetailCard";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getTourDetail, getRegionTours } from "@/lib/frontend-queries";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, tourSchema } from "@/lib/structured-data";

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

// A shared tour link (or a page refresh) lands here directly. Instead of a
// standalone page, we render the tour's sub-region listing with the tour modal
// open over it — identical to opening the tour from an in-site card. On soft
// navigation this route is intercepted by @modal/(.)tours/[tourSlug] instead.
export default async function TourPage({ params }: Props) {
  const { tourSlug } = await params;

  const tour = await getTourDetail(tourSlug);
  if (!tour) notFound();

  // The listing that sits behind the modal.
  const data = await getRegionTours(tour.regionSlug);
  if (!data) notFound();

  const hasSub = data.subRegions.some((sr) => sr.slug === tour.subSlug);
  const activeSlug = hasSub ? tour.subSlug : data.subRegions[0]?.slug ?? "";
  const listingUrl = `/regions/${tour.regionSlug}/${tour.subSlug}`;

  const canonicalPath = `/tours/${tour.productId ?? tour.slug}`;
  const tourImages = [
    tour.thumbnail,
    ...tour.media.filter((m) => m.kind === "image").map((m) => m.url),
  ].filter((u): u is string => Boolean(u));

  return (
    <>
      <JsonLd
        data={[
          tourSchema({
            name: tour.name,
            description: tour.description,
            path: canonicalPath,
            images: tourImages,
            price: tour.price,
            regionName: tour.regionName,
          }),
          breadcrumbSchema([
            { name: "首頁", path: "/" },
            { name: tour.regionName, path: `/regions/${tour.regionSlug}` },
            { name: tour.subRegionName, path: listingUrl },
            { name: tour.name, path: canonicalPath },
          ]),
        ]}
      />
      <SubRegionListing
        data={data}
        regionSlug={tour.regionSlug}
        activeSlug={activeSlug}
        activeName={tour.subRegionName}
      />
      <TourModalShell closeHref={listingUrl}>
        <TourDetailCard tour={tour} headingTag="h1" />
      </TourModalShell>
    </>
  );
}
