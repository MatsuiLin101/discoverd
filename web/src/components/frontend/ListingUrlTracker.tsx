"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** sessionStorage key holding the last listing URL sitting behind the tour modal. */
export const LISTING_URL_KEY = "fh:lastListingUrl";

/**
 * Records the most recent non-tour URL (a listing / search / home page) so the
 * tour modal's close button can return there directly instead of stepping back
 * through any related-tour history.
 *
 * Tour URLs (/tours/...) are the modal itself and are skipped, so the stored
 * value always points at the page rendered behind the modal.
 */
export default function ListingUrlTracker() {
  const pathname = usePathname();
  // Depending on the search params makes the effect re-run when only the query
  // changes (e.g. filters on the /search page), keeping the stored URL current.
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/tours/")) return;
    // Read the live location so shallow query updates are captured too.
    const url = `${window.location.pathname}${window.location.search}`;
    try {
      window.sessionStorage.setItem(LISTING_URL_KEY, url);
    } catch {
      // sessionStorage can be unavailable (private mode); ignore.
    }
  }, [pathname, searchParams]);

  return null;
}
