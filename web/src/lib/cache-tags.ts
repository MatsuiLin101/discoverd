/**
 * Cache tags for the public frontend's data cache (unstable_cache).
 *
 * Frontend query functions are wrapped in `unstable_cache` and tagged with the
 * entries below; admin mutations call `revalidateTag` with the matching tag so
 * an edit is reflected on the next public request. `CACHE_BACKSTOP` is only a
 * safety net for a missed revalidation — freshness normally comes from the
 * on-demand `revalidateTag` calls.
 */
export const CACHE_TAGS = {
  tours: "tours",
  regions: "regions",
  tags: "tags",
  heroBanners: "hero-banners",
  siteSetting: "site-setting",
  // Note: the footer's "業務團隊" data comes from the uncached public /api/sales
  // route (always fresh), so it needs no tag/revalidation here.
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Backstop revalidation window (seconds); on-demand revalidateTag is primary. */
export const CACHE_BACKSTOP = 3600;
