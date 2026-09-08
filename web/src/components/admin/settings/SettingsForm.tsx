"use client";

import { useState, useEffect, FormEvent } from "react";
import CharCountField from "@/components/admin/CharCountField";

export default function SettingsForm() {
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [lineCommunityUrl, setLineCommunityUrl] = useState("");

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
        body: JSON.stringify({ facebookUrl, instagramUrl, lineUrl, lineCommunityUrl }),
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
        <h1 className="text-2xl font-bold text-gray-800">社群連結</h1>
        <p className="mt-1 text-sm text-gray-500">設定前台 Header 及 Footer 的社群媒體連結，留空則隱藏該按鈕</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-5">
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
