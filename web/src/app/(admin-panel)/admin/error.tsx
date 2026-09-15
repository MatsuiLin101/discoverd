"use client";

import { useEffect } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/admin-path";

// Admin-side error boundary. Keeps runtime errors in the admin panel on an
// admin-styled screen (rendered inside the admin shell) instead of bubbling up
// to the Next.js default error page. Separate from the frontend's error.tsx,
// which only covers the (frontend) route group.
export default function AdminError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-gray-300">500</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-800">系統發生錯誤</h1>
      <p className="mt-2 text-sm text-gray-500">
        操作無法完成,請重試,或返回後台首頁。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center rounded-md bg-gray-800 px-5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          重新整理
        </button>
        <Link
          href={adminUrl()}
          className="inline-flex h-10 items-center rounded-md border border-gray-300 px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          回到後台首頁
        </Link>
      </div>
    </div>
  );
}
