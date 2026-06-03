import { db } from "@/lib/db";
import type { RegionListItem, RegionDetail, RegionTours } from "@/lib/frontend-data";

// ── Function 1 ──────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage)
export async function getRegionList(): Promise<RegionListItem[]> {
  const rows = await db.region.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      thumbnail: true,
      subRegions: {
        select: {
          _count: { select: { tours: { where: { published: true } } } },
        },
      },
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    thumbnail: r.thumbnail,
    tourCount: r.subRegions.reduce((sum, sr) => sum + sr._count.tours, 0),
  }));
}

// ── Function 2 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/page.tsx (region page)
// Returns null when slug not found (caller calls notFound())
export async function getRegionDetail(slug: string): Promise<RegionDetail | null> {
  const region = await db.region.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      thumbnail: true,
      subRegions: {
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          name: true,
          thumbnail: true,
          _count: { select: { tours: { where: { published: true } } } },
        },
      },
    },
  });
  if (!region) return null;
  return {
    slug: region.slug,
    name: region.name,
    thumbnail: region.thumbnail,
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      thumbnail: sr.thumbnail,
      tourCount: sr._count.tours,
    })),
  };
}

// ── Function 3 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/[subSlug]/page.tsx (tour page)
// Returns null when slug not found (caller calls notFound())
export async function getRegionTours(slug: string): Promise<RegionTours | null> {
  const region = await db.region.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      subRegions: {
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          name: true,
          tours: {
            where: { published: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              slug: true,
              name: true,
              thumbnail: true,
              price: true,
              description: true,
              tags: { select: { name: true } },
              files: {
                where: { mimeType: { startsWith: "image/" } },
                orderBy: { sortOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });
  if (!region) return null;
  return {
    region: { slug: region.slug, name: region.name },
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      tours: sr.tours.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        thumbnail: t.thumbnail,
        price: t.price,
        description: t.description,
        tags: t.tags.map((tag) => tag.name),
        images: t.files.map((f) => f.url),
      })),
    })),
  };
}
