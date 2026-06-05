"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

interface Tag {
  id: string;
  name: string;
}

export default function TagForm({ tag }: { tag?: Tag }) {
  const router = useRouter();
  const isEdit = !!tag;
  const [name, setName] = useState(tag?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const url = isEdit ? `/api/admin/tags/${tag.id}` : "/api/admin/tags";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.data) {
        sessionStorage.setItem(
          "adminSaveMsg",
          isEdit ? `已更新標籤「${name}」` : `已新增標籤「${name}」`
        );
        router.push("/admin/tags");
        router.refresh();
      } else {
        setError(data.error ?? (isEdit ? "更新失敗" : "新增失敗"));
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div>
        <label className={labelClass}>標籤名稱<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="例如：家庭旅遊"
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#D12351" }}
        >
          {isPending ? (isEdit ? "儲存中…" : "新增中…") : isEdit ? "儲存變更" : "新增標籤"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/tags")}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          {isEdit ? "返回列表" : "取消"}
        </button>
      </div>
    </form>
  );
}
