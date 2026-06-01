"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  regionId: string;
  subId: string;
  tourCount: number;
}

export default function DeleteSubRegionButton({ regionId, subId, tourCount }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("確定要刪除此次分類嗎？")) return;
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regions/${regionId}/subs/${subId}`, {
        method: "DELETE",
      });
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
        disabled={isPending || tourCount > 0}
        title={tourCount > 0 ? "此次分類下還有旅遊方案，無法刪除" : undefined}
        className="cursor-pointer rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
