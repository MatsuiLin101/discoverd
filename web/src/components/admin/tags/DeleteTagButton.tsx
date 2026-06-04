"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTagButton({
  tagId,
  tourCount,
}: {
  tagId: string;
  tourCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const message =
      tourCount > 0
        ? `此標籤已被 ${tourCount} 個旅遊方案使用，確定要刪除？`
        : "確定刪除此標籤？";
    if (!confirm(message)) return;
    setError(null);

    const res = await fetch(`/api/admin/tags/${tagId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "刪除失敗");
    }
  }

  return (
    <span>
      <button
        onClick={handleDelete}
        className="text-sm cursor-pointer text-rose-500 hover:text-rose-700 whitespace-nowrap"
      >
        刪除
      </button>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </span>
  );
}
