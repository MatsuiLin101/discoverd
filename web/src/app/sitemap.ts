import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [regions, tours] = await Promise.all([
    db.region.findMany({
      select: {
        slug: true,
        subRegions: { select: { slug: true } },
      },
    }),
    db.tour.findMany({
      where: { published: true },
      select: { slug: true },
    }),
  ]);

  const regionEntries: MetadataRoute.Sitemap = regions.map((r) => ({
    url: `${base}/regions/${r.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const subRegionEntries: MetadataRoute.Sitemap = regions.flatMap((r) =>
    r.subRegions.map((sr) => ({
      url: `${base}/regions/${r.slug}/${sr.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const tourEntries: MetadataRoute.Sitemap = tours.map((t) => ({
    url: `${base}/tours/${t.slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    {
      url: base,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    ...regionEntries,
    ...subRegionEntries,
    ...tourEntries,
  ];
}
