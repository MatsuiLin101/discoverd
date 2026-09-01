"use client";

import { useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";

// Catches unexpected runtime errors thrown while rendering any frontend route.
// Must be a client component; `reset()` re-attempts to render the segment.
// SiteFooter is an async server component and can't be used here, so we keep the
// header plus a retry action.
export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader />

      <main className="fh-error">
        <div className="fh-error-inner">
          <p className="fh-error-code">500</p>
          <h1 className="fh-error-title">系統發生了一點問題</h1>
          <p className="fh-error-desc">
            頁面暫時無法載入,請稍後再試,或返回首頁。
          </p>
          <div className="fh-error-actions">
            <button
              type="button"
              className="fh-error-btn primary"
              onClick={() => reset()}
            >
              重新整理
            </button>
            <Link className="fh-error-btn" href="/">
              回到首頁
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
