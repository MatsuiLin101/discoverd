"use client";

import { useState, FormEvent } from "react";

const OPTIONS = [
  { value: "cover", label: "滿版（會裁切左右／上下）" },
  { value: "2/1", label: "2 : 1（完整顯示，無留白）" },
  { value: "4/3", label: "4 : 3（完整顯示，上下微留白）" },
  { value: "1/1", label: "1 : 1（完整顯示，上下留白）" },
];

export default function MobileHeroRatioSetting({ initialRatio }: { initialRatio: string }) {
  const [ratio, setRatio] = useState(initialRatio);
  const [saved, setSaved] = useState(initialRatio);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = ratio !== saved;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/hero-banners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileHeroRatio: ratio }),
      });
      const data = await res.json();
      if (data.data) {
        setSaved(ratio);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-gray-800">手機版輪播圖比例</h2>
      <p className="mt-1 text-sm text-gray-500">
        桌機版維持滿版呈現，不受影響。此設定只作用於手機版（螢幕寬度 768px 以下）。「滿版」會裁切圖片邊緣；其他比例會完整顯示整張圖，不足處以深色留白補滿。建議原圖 2560 × 1280（2:1）、重點置中。
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 sm:max-w-xs"
          style={{ ["--tw-ring-color" as string]: "#D12351" }}
          aria-label="手機版輪播圖比例"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isPending || !dirty}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          {isPending ? "儲存中…" : "儲存比例"}
        </button>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">已成功儲存</p>}
      </form>
    </div>
  );
}
