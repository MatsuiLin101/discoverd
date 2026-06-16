import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { RegionListItem, RegionDetail, RegionTours } from "@/lib/frontend-data";

/** Map a stored object key to its public URL (null-safe). */
const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

// ── Function 1 ──────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage)
export async function getRegionList(): Promise<RegionListItem[]> {
  const rows = await db.region.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      thumbnailKey: true,
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
    thumbnail: urlOf(r.thumbnailKey),
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
      thumbnailKey: true,
      seoTitle: true,
      seoDescription: true,
      ogImageKey: true,
      subRegions: {
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          name: true,
          thumbnailKey: true,
          _count: { select: { tours: { where: { published: true } } } },
        },
      },
    },
  });
  if (!region) return null;
  return {
    slug: region.slug,
    name: region.name,
    thumbnail: urlOf(region.thumbnailKey),
    seoTitle: region.seoTitle,
    seoDescription: region.seoDescription,
    ogImage: urlOf(region.ogImageKey),
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      thumbnail: urlOf(sr.thumbnailKey),
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
          seoTitle: true,
          seoDescription: true,
          ogImageKey: true,
          tours: {
            where: { published: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              slug: true,
              name: true,
              thumbnailKey: true,
              price: true,
              description: true,
              tags: { select: { name: true } },
              files: {
                where: { mimeType: { startsWith: "image/" } },
                orderBy: { sortOrder: "asc" },
                select: { key: true },
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
      seoTitle: sr.seoTitle,
      seoDescription: sr.seoDescription,
      ogImage: urlOf(sr.ogImageKey),
      tours: sr.tours.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        thumbnail: urlOf(t.thumbnailKey),
        price: t.price,
        description: t.description,
        tags: t.tags.map((tag) => tag.name),
        images: t.files.map((f) => storage.publicUrl(f.key)),
      })),
    })),
  };
}
