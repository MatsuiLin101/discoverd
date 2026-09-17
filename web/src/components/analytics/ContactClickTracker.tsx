"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Delegated click tracker for outbound LINE contact links. A single document
// listener covers every LINE anchor on the frontend — header, footer (a server
// component), tour detail actions and the staff modal — without wiring an
// onClick into each one. Mounted once in the (frontend) layout.
export default function ContactClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor?.href) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (!url.hostname.includes("line.me")) return;

      trackEvent("contact_click", { method: "line", link_url: url.href });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
