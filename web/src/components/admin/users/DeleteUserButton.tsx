"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({
  userId,
  isSelf,
}: {
  userId: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("確定要刪除這位使用者嗎？此操作無法復原。")) return;
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "刪除失敗");
    }
  }

  if (isSelf) {
    return (
      <span className="text-sm text-gray-300 cursor-not-allowed" title="不可刪除自己的帳號">
        刪除
      </span>
    );
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
