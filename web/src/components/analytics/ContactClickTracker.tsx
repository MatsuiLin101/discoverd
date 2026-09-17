"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Delegated click tracker for social / contact links. Any anchor tagged with a
// `data-contact` attribute is tracked, regardless of its href — so tracking
// keeps working even when the destination URLs change. Covers anchors rendered
// by both server and client components without per-anchor wiring. The attribute
// value is a stable channel label (e.g. "line", "facebook"); GA can further
// distinguish by link_url. Mounted once in the (frontend) layout.
export default function ContactClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[data-contact]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      trackEvent("contact_click", {
        method: anchor.dataset.contact || "other",
        link_url: anchor.href,
      });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
