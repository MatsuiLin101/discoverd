"use client";

import { useState, useEffect } from "react";

interface SocialLinks {
  facebookUrl: string | null;
  instagramUrl: string | null;
  lineUrl: string | null;
  lineCommunityUrl: string | null;
}

export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>({
    facebookUrl: null,
    instagramUrl: null,
    lineUrl: null,
    lineCommunityUrl: null,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setLinks(data);
      })
      .catch(() => {});
  }, []);

  return links;
}
