"use client";

import { useState } from "react";

interface Props {
  regionId: string;
  name: string;
  subCount: number;
  tourCount: number;
  onDelete: (name: string) => void;
}

export default function DeleteRegionButton({ regionId, name, subCount, tourCount, onDelete }: Props) {
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
        onDelete(name);
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
        disabled={isPending || tourCount > 0}
        title={tourCount > 0 ? "此主分類下還有旅遊方案，無法刪除" : undefined}
        className="whitespace-nowrap cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
