import { revalidateTag } from "next/cache";
import type { CacheTag } from "@/lib/cache-tags";

/**
 * Invalidate the public frontend's data cache for the given tags after an admin
 * mutation. Call this only on the success path, after the DB write completes.
 *
 * Uses the `"max"` profile (stale-while-revalidate): the tagged entries are
 * marked stale, so the next public request serves the previous content once
 * while fresh data is fetched in the background, and subsequent requests are
 * fresh. `updateTag` (immediate) is not an option here because it only works in
 * Server Actions, and these mutations are Route Handlers.
 */
export function revalidatePublic(...tags: CacheTag[]): void {
  for (const tag of tags) revalidateTag(tag, "max");
}
