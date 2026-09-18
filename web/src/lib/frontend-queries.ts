import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeCrop } from "@/lib/crop";
import { compareTagName } from "@/lib/tag-sort";
import { CACHE_TAGS, CACHE_BACKSTOP } from "@/lib/cache-tags";
import type { Prisma } from "@/generated/prisma/client";
import type {
  RegionListItem,
  RegionDetail,
  RegionTours,
  RelatedTour,
  TourMedia,
  TourDetailData,
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

// ── Hero banners ────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage carousel)
export const getHeroBanners = unstable_cache(
  async (): Promise<{ img: string; alt: string }[]> => {
    const rows = await db.heroBanner.findMany({
      orderBy: { sortOrder: "asc" },
      select: { imageKey: true, title: true },
    });
    return rows.map((b) => ({ img: storage.publicUrl(b.imageKey), alt: b.title }));
  },
  ["getHeroBanners"],
  { tags: [CACHE_TAGS.heroBanners], revalidate: CACHE_BACKSTOP },
);

// ── Function 1 ──────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage)
export const getRegionList = unstable_cache(
  async (): Promise<RegionListItem[]> => {
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
  },
  ["getRegionList"],
  { tags: [CACHE_TAGS.regions, CACHE_TAGS.tours], revalidate: CACHE_BACKSTOP },
);

// ── Function 2 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/page.tsx (region page)
// Returns null when slug not found (caller calls notFound())
export const getRegionDetail = unstable_cache(
  async (slug: string): Promise<RegionDetail | null> => {
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
  },
  ["getRegionDetail"],
  { tags: [CACHE_TAGS.regions, CACHE_TAGS.tours], revalidate: CACHE_BACKSTOP },
);

// ── Function 3 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/[subSlug]/page.tsx (tour page)
// Returns null when slug not found (caller calls notFound())
export const getRegionTours = unstable_cache(
  async (slug: string): Promise<RegionTours | null> => {
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
  },
  ["getRegionTours"],
  { tags: [CACHE_TAGS.regions, CACHE_TAGS.tours, CACHE_TAGS.tags], revalidate: CACHE_BACKSTOP },
);

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
    if (f.tagMode === "all") {
      // Every selected tag must be present: one `some` condition per tag.
      for (const name of tags) AND.push({ tags: { some: { name } } });
    } else {
      AND.push({ tags: { some: { name: { in: tags } } } });
    }
  }

  return { AND };
}

/**
 * Run a search. `limit` caps the returned rows (clamped to SEARCH_MAX_LIMIT);
 * `total` is always the full hit count so callers can show "N 筆 / 檢視全部".
 */
export const searchTours = unstable_cache(
  async (f: SearchFilters, limit = 8): Promise<SearchResponse> => {
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
  },
  ["searchTours"],
  { tags: [CACHE_TAGS.tours, CACHE_TAGS.regions, CACHE_TAGS.tags], revalidate: CACHE_BACKSTOP },
);

// ── Function 5 ──────────────────────────────────────────────
// Used by: app/(frontend)/search/page.tsx — the facets that populate
// the advanced-search controls (main category → sub category → tags).
export const getSearchFilters = unstable_cache(
  async (): Promise<SearchFilterData> => {
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

  // Advanced-search tags are sorted purely by text (see compareTagName).
  const sortedTags = tags.map((t) => t.name).sort(compareTagName);

  return {
    regions: regions.map((r) => ({
      slug: r.slug,
      name: r.name,
      subRegions: r.subRegions.map((sr) => ({ slug: sr.slug, name: sr.name })),
    })),
    tags: sortedTags,
  };
  },
  ["getSearchFilters"],
  { tags: [CACHE_TAGS.tags, CACHE_TAGS.regions], revalidate: CACHE_BACKSTOP },
);

// ── Related tours ───────────────────────────────────────────
// Used by: the tour detail card's "相關行程" section (standalone page + modal).
// Automatically picks other published tours in the same region, prioritising
// the same sub-region, excluding the current tour.
export const getRelatedTours = unstable_cache(
  async (
    regionSlug: string,
    subSlug: string,
    excludeTourId: string,
    limit = 4,
  ): Promise<RelatedTour[]> => {
    const rows = await db.tour.findMany({
      where: {
        published: true,
        id: { not: excludeTourId },
        subRegion: { region: { slug: regionSlug } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 48,
      select: {
        productId: true,
        slug: true,
        name: true,
        thumbnailKey: true,
        thumbnailCrop: true,
        price: true,
        subRegion: { select: { slug: true, name: true } },
      },
    });

    // Same sub-region first, then the rest of the region, keeping DB order.
    const sameSub = rows.filter((r) => r.subRegion.slug === subSlug);
    const otherSub = rows.filter((r) => r.subRegion.slug !== subSlug);
    return [...sameSub, ...otherSub].slice(0, limit).map((r) => ({
      productId: r.productId,
      slug: r.slug,
      name: r.name,
      thumbnail: urlOf(r.thumbnailKey),
      crop: normalizeCrop(r.thumbnailCrop),
      price: r.price,
      subRegionName: r.subRegion.name,
    }));
  },
  ["getRelatedTours"],
  { tags: [CACHE_TAGS.tours, CACHE_TAGS.regions], revalidate: CACHE_BACKSTOP },
);

// ── Function 6 ──────────────────────────────────────────────
// Used by: app/(frontend)/tours/[tourSlug]/page.tsx (standalone tour page)
//          and app/(frontend)/@modal/(.)tours/[tourSlug]/page.tsx (intercepted
//          modal). Both render the shared <TourDetailCard> from this payload so
//          they stay visually identical. Matches by productId first, then slug.
// Returns null when not found / unpublished (caller calls notFound()).
export const getTourDetail = unstable_cache(
  async (idOrSlug: string): Promise<TourDetailData | null> => {
  const tour = await db.tour.findFirst({
    where: { published: true, OR: [{ productId: idOrSlug }, { slug: idOrSlug }] },
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
      files: {
        orderBy: { sortOrder: "asc" },
        select: { key: true, mimeType: true, filename: true },
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
  if (!tour) return null;

  return {
    id: tour.id,
    slug: tour.slug,
    productId: tour.productId,
    name: tour.name,
    thumbnail: urlOf(tour.thumbnailKey),
    price: tour.price,
    description: tour.description,
    tags: tour.tags.map((t) => t.name),
    media: tour.files.map(toTourMedia),
    regionName: tour.subRegion.region.name,
    regionSlug: tour.subRegion.region.slug,
    subRegionName: tour.subRegion.name,
    subSlug: tour.subRegion.slug,
  };
  },
  ["getTourDetail"],
  { tags: [CACHE_TAGS.tours, CACHE_TAGS.regions, CACHE_TAGS.tags], revalidate: CACHE_BACKSTOP },
);
