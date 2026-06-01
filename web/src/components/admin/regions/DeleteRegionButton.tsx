"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  regionId: string;
  subCount: number;
}

export default function DeleteRegionButton({ regionId, subCount }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    const msg =
      subCount > 0
        ? `此主分類下有 ${subCount} 個次分類，刪除後將一併刪除。確定要刪除嗎？`
        : "確定要刪除此主分類嗎？";
    if (!confirm(msg)) return;
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regions/${regionId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
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
        className="cursor-pointer rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
