"use client";

import { useState } from "react";

export default function TourShareButton({ urlId }: { urlId: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/tours/${urlId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        className={`m-share${copied ? " copied" : ""}`}
        type="button"
        onClick={copy}
        aria-label={copied ? "已複製連結" : "複製行程連結"}
      >
        {copied ? "已複製" : "分享"}
      </button>
      <div className={`fh-toast${copied ? " visible" : ""}`} aria-live="polite">
        已複製連結！
      </div>
    </>
  );
}
