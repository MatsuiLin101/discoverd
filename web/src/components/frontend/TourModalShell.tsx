"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Client shell for the tour modal: dark overlay + close button + ESC /
 * backdrop-click to dismiss + body scroll lock. The card content is passed as
 * children (a server component).
 *
 * Closing prefers `router.back()` (intercepted soft navigation) so the URL
 * returns to the listing and forward/back behave naturally. On a hard-loaded
 * shared link there is no in-site history to go back to, so the standalone page
 * passes `closeHref` (the listing URL) and we navigate there instead.
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
    if (closeHref) router.push(closeHref);
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
