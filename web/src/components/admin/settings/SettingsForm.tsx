"use client";

import { useState, useEffect, FormEvent } from "react";
import CharCountField from "@/components/admin/CharCountField";

export default function SettingsForm() {
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [lineCommunityUrl, setLineCommunityUrl] = useState("");
  const [mobileHeroRatio, setMobileHeroRatio] = useState("cover");

  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setFacebookUrl(data.facebookUrl ?? "");
          setInstagramUrl(data.instagramUrl ?? "");
          setLineUrl(data.lineUrl ?? "");
          setLineCommunityUrl(data.lineCommunityUrl ?? "");
          setMobileHeroRatio(data.mobileHeroRatio ?? "cover");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facebookUrl, instagramUrl, lineUrl, lineCommunityUrl, mobileHeroRatio }),
      });
      const data = await res.json();
      if (data.data) {
        setSuccess(true);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">網站設定</h1>
        <p className="mt-1 text-sm text-gray-500">設定社群連結與首頁輪播圖呈現方式</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-5">
          <h2 className="border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700">社群連結</h2>

          <CharCountField
            label="Facebook 網址"
            type="url"
            value={facebookUrl}
            onChange={setFacebookUrl}
            maxLength={300}
            placeholder="https://www.facebook.com/yourpage"
          />

          <CharCountField
            label="Instagram 網址"
            type="url"
            value={instagramUrl}
            onChange={setInstagramUrl}
            maxLength={300}
            placeholder="https://www.instagram.com/yourhandle"
          />

          <CharCountField
            label="LINE 網址"
            type="url"
            value={lineUrl}
            onChange={setLineUrl}
            maxLength={300}
            placeholder="https://line.me/ti/p/~yourlineid"
          />

          <CharCountField
            label="LINE 社群網址"
            type="url"
            value={lineCommunityUrl}
            onChange={setLineCommunityUrl}
            maxLength={300}
            placeholder="https://line.me/ti/g2/yourgroupid"
          />

          <h2 className="border-b border-gray-100 pb-2 pt-3 text-sm font-semibold text-gray-700">首頁輪播圖</h2>

          <div>
            <label htmlFor="mobileHeroRatio" className="mb-1 block text-sm font-medium text-gray-700">
              手機版輪播圖比例
            </label>
            <select
              id="mobileHeroRatio"
              value={mobileHeroRatio}
              onChange={(e) => setMobileHeroRatio(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: "#D12351" }}
            >
              <option value="cover">滿版（會裁切左右／上下）</option>
              <option value="2/1">2 : 1（完整顯示，無留白）</option>
              <option value="4/3">4 : 3（完整顯示，上下微留白）</option>
              <option value="1/1">1 : 1（完整顯示，上下留白）</option>
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              桌機版不受影響，維持滿版呈現。「滿版」會裁切圖片邊緣；其他比例會完整顯示整張圖，不足處以深色留白補滿。建議原圖 2560 × 1280（2:1）、重點置中。
            </p>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">已成功儲存</p>}

          <button
            type="submit"
            disabled={isPending}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            {isPending ? "儲存中…" : "儲存"}
          </button>
        </form>
      )}
    </div>
  );
}
