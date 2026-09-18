import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS, CACHE_BACKSTOP } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

// Sitemap entries change only when regions/tours change, so cache them under the
// same tags the admin mutations revalidate.
const getSitemapData = unstable_cache(
  async () =>
    Promise.all([
      db.region.findMany({
        select: {
          slug: true,
          updatedAt: true,
          subRegions: { select: { slug: true, updatedAt: true } },
        },
      }),
      db.tour.findMany({
        where: { published: true },
        select: { slug: true, productId: true, updatedAt: true },
      }),
    ]),
  ["sitemap-data"],
  { tags: [CACHE_TAGS.regions, CACHE_TAGS.tours], revalidate: CACHE_BACKSTOP },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [regions, tours] = await getSitemapData();

  const regionEntries: MetadataRoute.Sitemap = regions.map((r) => ({
    url: `${base}/regions/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const subRegionEntries: MetadataRoute.Sitemap = regions.flatMap((r) =>
    r.subRegions.map((sr) => ({
      url: `${base}/regions/${r.slug}/${sr.slug}`,
      lastModified: sr.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const tourEntries: MetadataRoute.Sitemap = tours.map((t) => ({
    url: `${base}/tours/${t.productId ?? t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // Home reflects the most recent change anywhere in the catalog.
  const latest = [...regions, ...tours].reduce<Date | undefined>((max, item) => {
    const d = item.updatedAt;
    return !max || d > max ? d : max;
  }, undefined);

  return [
    {
      url: base,
      lastModified: latest,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    ...regionEntries,
    ...subRegionEntries,
    ...tourEntries,
  ];
}
