"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client shell for the intercepted tour modal: dark overlay + close button +
 * ESC / backdrop-click to dismiss + body scroll lock. Closing navigates back
 * (router.back()) so the URL returns to the listing and forward/back behave
 * naturally. The card content is passed as children (a server component).
 */
export default function TourModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      className="fh-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div className="fh-modal" role="dialog" aria-modal="true">
        <button className="fh-modal-x" onClick={() => router.back()} aria-label="關閉">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
