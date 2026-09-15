"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Live countdown that sends the visitor back home once it reaches zero. Kept as
// a small client island so NotFoundScreen can stay a server component (it needs
// to render the async SiteFooter). Uses replace() so the 404 doesn't linger in
// history behind the homepage.
export default function NotFoundRedirect({
  seconds = 5,
  href = "/",
}: {
  seconds?: number;
  href?: string;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      router.replace(href);
      return;
    }
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, href, router]);

  return (
    <p className="fh-error-countdown" aria-live="polite">
      <span className="fh-error-count">{Math.max(left, 0)}</span> 秒後自動回到首頁
    </p>
  );
}
