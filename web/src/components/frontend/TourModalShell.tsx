"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LISTING_URL_KEY } from "./ListingUrlTracker";

/**
 * Client shell for the tour modal: dark overlay + close button + ESC /
 * backdrop-click to dismiss + body scroll lock. The card content is passed as
 * children (a server component).
 *
 * Closing dismisses the modal straight back to the listing behind it, rather
 * than stepping back through any related-tour history. Related-tour links push
 * onto the history stack (so the browser back/forward buttons still walk through
 * the tours the visitor viewed), and the X / ESC / backdrop close pushes the
 * listing on top in a single step.
 *
 * We push (rather than replace) so the closed tour entry survives underneath:
 * the forward button stays disabled right after closing, and pressing back
 * reopens the tour the visitor was viewing. Replacing would overwrite that entry
 * and, when the entry below is the same listing, leave two identical adjacent
 * history entries.
 *
 * The target listing URL is, in order of preference:
 *  1. `closeHref` — passed by the standalone page for a hard-loaded shared link.
 *  2. The last listing URL recorded by ListingUrlTracker while browsing.
 *  3. `router.back()` as a safe fallback if neither is available.
 */
export default function TourModalShell({
  children,
  closeHref,
}: {
  children: React.ReactNode;
  closeHref?: string;
}) {
  const router = useRouter();

  const close = useCallback(() => {
    let target = closeHref;
    if (!target) {
      try {
        target = window.sessionStorage.getItem(LISTING_URL_KEY) ?? undefined;
      } catch {
        target = undefined;
      }
    }
    if (target) router.push(target);
    else router.back();
  }, [router, closeHref]);

  // Lock body scroll while the modal is mounted.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape closes the modal.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  return (
    <div
      className="fh-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="fh-modal" role="dialog" aria-modal="true">
        <button className="fh-modal-x" onClick={close} aria-label="關閉">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
