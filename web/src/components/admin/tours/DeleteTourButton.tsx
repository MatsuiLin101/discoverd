"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tourId: string;
  name: string;
  onDelete?: (name: string) => void;
}

export default function DeleteTourButton({ tourId, name, onDelete }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("確定刪除此旅遊方案？刪除後無法復原。")) return;
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch(`/api/admin/tours/${tourId}`, { method: "DELETE" });
      if (res.ok) {
        if (onDelete) {
          onDelete(name);
        } else {
          router.refresh();
        }
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
    <span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="whitespace-nowrap cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "刪除中…" : "刪除"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </span>
  );
}
