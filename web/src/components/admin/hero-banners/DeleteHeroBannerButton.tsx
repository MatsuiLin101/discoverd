"use client";

import { useState } from "react";

interface Props {
  bannerId: string;
  title: string;
  onDelete: (title: string) => void;
}

export default function DeleteHeroBannerButton({ bannerId, title, onDelete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`確定要刪除輪播圖「${title}」嗎？`)) return;
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hero-banners/${bannerId}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(title);
      } else {
        const data = await res.json();
        setError(data.error ?? "刪除失敗");
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="whitespace-nowrap cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
