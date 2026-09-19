"use client";

import { useState, useEffect } from "react";

export interface SocialLinks {
  facebookUrl: string | null;
  instagramUrl: string | null;
  lineUrl: string | null;
  lineCommunityUrl: string | null;
}

const EMPTY: SocialLinks = {
  facebookUrl: null,
  instagramUrl: null,
  lineUrl: null,
  lineCommunityUrl: null,
};

/**
 * Social links for the frontend chrome.
 *
 * Prefer passing `initial` from a Server Component (which already has the cached
 * site setting) — the links then render in the initial SSR HTML with no client
 * fetch and no layout shift. Only when no initial value is available (e.g. the
 * client-only error boundary) does this fall back to fetching `/api/settings`.
 */
export function useSocialLinks(initial?: SocialLinks | null): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(initial ?? EMPTY);

  useEffect(() => {
    // Server already provided the links — skip the network round-trip.
    if (initial) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setLinks(data);
      })
      .catch(() => {});
  }, [initial]);

  return links;
}
