import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { toTourMedia } from "@/lib/frontend-queries";
import TourPreviewFrame from "@/components/frontend/TourPreviewFrame";

const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TourPreviewPage({
  params,
}: {
  params: Promise<{ tourSlug: string }>;
}) {
  const { tourSlug } = await params;

  const tour = await db.tour.findUnique({
    where: { slug: tourSlug },
    select: {
      name: true,
      price: true,
      description: true,
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
          region: { select: { name: true } },
        },
      },
    },
  });

  if (!tour) notFound();

  return (
    <TourPreviewFrame
      tour={{
        slug: tourSlug,
        name: tour.name,
        price: tour.price,
        description: tour.description,
        thumbnail: urlOf(tour.thumbnailKey),
        tags: tour.tags.map((t) => t.name),
        media: tour.files.map(toTourMedia),
        regionName: tour.subRegion.region.name,
        subRegionName: tour.subRegion.name,
      }}
    />
  );
}
