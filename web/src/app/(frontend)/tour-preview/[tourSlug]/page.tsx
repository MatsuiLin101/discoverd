import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import TourPreviewFrame from "@/components/frontend/TourPreviewFrame";

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
          region: { select: { name: true } },
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

  return (
    <TourPreviewFrame
      tour={{
        name: tour.name,
        price: tour.price,
        description: tour.description,
        thumbnail: tour.thumbnail,
        tags: tour.tags.map((t) => t.name),
        images,
        regionName: tour.subRegion.region.name,
        subRegionName: tour.subRegion.name,
      }}
    />
  );
}
