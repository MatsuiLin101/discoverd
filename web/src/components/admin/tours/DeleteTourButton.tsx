"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTourButton({ tourId }: { tourId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("確定刪除此旅遊方案？刪除後無法復原。")) return;
    setError(null);

    const res = await fetch(`/api/admin/tours/${tourId}`, { method: "DELETE" });
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
        className="whitespace-nowrap cursor-pointer text-sm text-rose-500 hover:text-rose-700"
      >
        刪除
      </button>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </span>
  );
}
