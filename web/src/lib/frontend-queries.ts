import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeCrop } from "@/lib/crop";
import type { RegionListItem, RegionDetail, RegionTours, TourMedia } from "@/lib/frontend-data";

/** Map a stored object key to its public URL (null-safe). */
const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

/** Map a TourFile row to a frontend TourMedia item. */
export const toTourMedia = (f: { key: string; mimeType: string; filename: string | null }): TourMedia => ({
  kind: f.mimeType.startsWith("image/") ? "image" : "pdf",
  url: storage.publicUrl(f.key),
  filename: f.filename,
});

// ── Function 1 ──────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage)
export async function getRegionList(): Promise<RegionListItem[]> {
  const rows = await db.region.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      thumbnailKey: true,
      thumbnailCrop: true,
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
    crop: normalizeCrop(r.thumbnailCrop),
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
      thumbnailCrop: true,
      seoTitle: true,
      seoDescription: true,
      ogImageKey: true,
      subRegions: {
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          name: true,
          thumbnailKey: true,
          thumbnailCrop: true,
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
    crop: normalizeCrop(region.thumbnailCrop),
    seoTitle: region.seoTitle,
    seoDescription: region.seoDescription,
    ogImage: urlOf(region.ogImageKey),
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      thumbnail: urlOf(sr.thumbnailKey),
      crop: normalizeCrop(sr.thumbnailCrop),
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
              productId: true,
              name: true,
              thumbnailKey: true,
              thumbnailCrop: true,
              price: true,
              description: true,
              tags: { select: { name: true } },
              files: {
                orderBy: { sortOrder: "asc" },
                select: { key: true, mimeType: true, filename: true },
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
        productId: t.productId,
        name: t.name,
        thumbnail: urlOf(t.thumbnailKey),
        crop: normalizeCrop(t.thumbnailCrop),
        price: t.price,
        description: t.description,
        tags: t.tags.map((tag) => tag.name),
        media: t.files.map(toTourMedia),
      })),
    })),
  };
}
