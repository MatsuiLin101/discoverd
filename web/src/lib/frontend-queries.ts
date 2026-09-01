import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeCrop } from "@/lib/crop";
import type { Prisma } from "@/generated/prisma/client";
import type {
  RegionListItem,
  RegionDetail,
  RegionTours,
  TourMedia,
  SearchFilters,
  SearchResponse,
  SearchFilterData,
} from "@/lib/frontend-data";

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

// ── Function 4 ──────────────────────────────────────────────
// Used by: GET /api/search (quick dropdown + full page fetches)
//          and app/(frontend)/search/page.tsx (initial SSR results)
//
// All filters are optional and combined with AND. When every filter
// is empty there is nothing to search, so we return an empty result
// instead of listing the whole catalogue.

/** Hard cap on how many rows a single search response returns. */
export const SEARCH_MAX_LIMIT = 100;

/** Build the Prisma `where` for a search, or null when no filter is set. */
function buildSearchWhere(f: SearchFilters): Prisma.TourWhereInput | null {
  const q = f.q?.trim();
  const tags = f.tags?.filter((t) => t.trim().length > 0) ?? [];
  const hasFilter = !!q || !!f.region || !!f.sub || tags.length > 0;
  if (!hasFilter) return null;

  const AND: Prisma.TourWhereInput[] = [{ published: true }];

  if (q) {
    AND.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
        { subRegion: { name: { contains: q, mode: "insensitive" } } },
        { subRegion: { region: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (f.region) {
    AND.push({ subRegion: { region: { slug: f.region } } });
    // A sub-region slug is only unique within its region, so only apply the
    // sub filter when a region is also selected (matching the UI flow).
    if (f.sub) AND.push({ subRegion: { slug: f.sub } });
  }

  if (tags.length > 0) {
    AND.push({ tags: { some: { name: { in: tags } } } });
  }

  return { AND };
}

/**
 * Run a search. `limit` caps the returned rows (clamped to SEARCH_MAX_LIMIT);
 * `total` is always the full hit count so callers can show "N 筆 / 檢視全部".
 */
export async function searchTours(f: SearchFilters, limit = 8): Promise<SearchResponse> {
  const where = buildSearchWhere(f);
  if (!where) return { total: 0, results: [] };

  const take = Math.min(Math.max(1, limit), SEARCH_MAX_LIMIT);

  const [total, rows] = await Promise.all([
    db.tour.count({ where }),
    db.tour.findMany({
      where,
      select: {
        id: true,
        slug: true,
        productId: true,
        name: true,
        thumbnailKey: true,
        price: true,
        description: true,
        tags: {
          select: { name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        subRegion: {
          select: {
            slug: true,
            name: true,
            region: { select: { slug: true, name: true } },
          },
        },
      },
      take,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    results: rows.map((t) => ({
      id: t.id,
      slug: t.slug,
      productId: t.productId,
      name: t.name,
      thumbnail: urlOf(t.thumbnailKey),
      price: t.price,
      description: t.description,
      tags: t.tags.map((tag) => tag.name),
      regionName: t.subRegion.region.name,
      regionSlug: t.subRegion.region.slug,
      subRegionName: t.subRegion.name,
      subRegionSlug: t.subRegion.slug,
    })),
  };
}

// ── Function 5 ──────────────────────────────────────────────
// Used by: app/(frontend)/search/page.tsx — the facets that populate
// the advanced-search controls (main category → sub category → tags).
export async function getSearchFilters(): Promise<SearchFilterData> {
  const [regions, tags] = await Promise.all([
    db.region.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        subRegions: {
          orderBy: { sortOrder: "asc" },
          select: { slug: true, name: true },
        },
      },
    }),
    db.tag.findMany({
      select: { name: true },
    }),
  ]);

  // Advanced-search tags are sorted purely by text (Traditional Chinese
  // collation) rather than the admin-defined sortOrder, so the chip list is
  // easy to scan. `numeric` makes embedded numbers sort by value, so e.g.
  // "4天" comes before "12天".
  const sortedTags = tags
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b, "zh-Hant", { numeric: true }));

  return {
    regions: regions.map((r) => ({
      slug: r.slug,
      name: r.name,
      subRegions: r.subRegions.map((sr) => ({ slug: sr.slug, name: sr.name })),
    })),
    tags: sortedTags,
  };
}
