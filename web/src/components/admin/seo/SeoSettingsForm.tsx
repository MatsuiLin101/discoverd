"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import CharCountField from "@/components/admin/CharCountField";
import { uploadFile } from "@/lib/upload-client";

export default function SeoSettingsForm() {
  const [seoSiteName, setSeoSiteName] = useState("");
  const [seoDefaultTitle, setSeoDefaultTitle] = useState("");
  const [seoDefaultDescription, setSeoDefaultDescription] = useState("");
  const [googleSiteVerification, setGoogleSiteVerification] = useState("");

  // OG image: server-stored URL, a locally-picked preview, and a clear flag.
  const [initialOgImage, setInitialOgImage] = useState<string | null>(null);
  const [ogPreview, setOgPreview] = useState<string | null>(null);
  const [clearOgImage, setClearOgImage] = useState(false);
  const ogFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/seo")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setSeoSiteName(data.seoSiteName ?? "");
          setSeoDefaultTitle(data.seoDefaultTitle ?? "");
          setSeoDefaultDescription(data.seoDefaultDescription ?? "");
          setGoogleSiteVerification(data.googleSiteVerification ?? "");
          setInitialOgImage(data.ogImageUrl ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleOgFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClearOgImage(false);
    setOgPreview(URL.createObjectURL(file));
  }

  function handleClearOgImage() {
    setClearOgImage(true);
    setOgPreview(null);
    if (ogFileRef.current) ogFileRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: Record<string, unknown> = {
        seoSiteName,
        seoDefaultTitle,
        seoDefaultDescription,
        googleSiteVerification,
      };

      const ogFile = ogFileRef.current?.files?.[0];
      if (ogFile) {
        const up = await uploadFile(ogFile, "seo-og/site");
        payload.ogImageKey = up.key;
      } else if (clearOgImage) {
        payload.clearOgImage = true;
      }

      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.data) {
        setSuccess(true);
        setInitialOgImage(data.data.ogImageUrl ?? null);
        setOgPreview(null);
        setClearOgImage(false);
        if (ogFileRef.current) ogFileRef.current.value = "";
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  const shownOg = clearOgImage ? null : (ogPreview ?? initialOgImage);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SEO 設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          設定全站的 SEO 預設值。各行程、地區可在自己的編輯頁單獨設定，留空的欄位會套用這裡的預設；再留空則使用系統內建值。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
          <CharCountField
            label="品牌名稱"
            value={seoSiteName}
            onChange={setSeoSiteName}
            maxLength={100}
            hint="用於社群分享標題與結構化資料，留空使用「找到了旅遊 FOUND HOLIDAY」"
            placeholder="找到了旅遊 FOUND HOLIDAY"
          />

          <CharCountField
            label="預設網站標題"
            value={seoDefaultTitle}
            onChange={setSeoDefaultTitle}
            maxLength={70}
            hint="首頁與未自訂標題的頁面使用，建議 60 字內"
            placeholder="找到了旅遊 FOUND HOLIDAY — 為您而寫的旅程"
          />

          <CharCountField
            label="預設網站描述"
            value={seoDefaultDescription}
            onChange={setSeoDefaultDescription}
            maxLength={160}
            multiline
            rows={3}
            hint="未自訂描述的頁面使用，建議 80–160 字"
            placeholder="找到了旅遊，精選日本、歐洲、東南亞等優質行程，由專業旅遊顧問為您量身打造。"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              預設分享圖（OG 圖片）
            </label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative h-[105px] w-[200px] shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                <Image
                  src={shownOg ?? "/og-default.jpg"}
                  alt="OG 圖片預覽"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1">
                <input
                  ref={ogFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleOgFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  未上傳則使用系統墊底圖。建議 1200×630、JPG、檔案 1MB 以內（LINE 分享上限）。
                </p>
                {shownOg && (
                  <button
                    type="button"
                    onClick={handleClearOgImage}
                    className="mt-1.5 cursor-pointer text-xs text-rose-500 hover:text-rose-700"
                  >
                    改回系統墊底圖
                  </button>
                )}
                {clearOgImage && (
                  <p className="mt-1.5 text-xs text-gray-400">將改用系統墊底圖，儲存後生效</p>
                )}
              </div>
            </div>
          </div>

          <CharCountField
            label="Google Search Console 驗證碼"
            value={googleSiteVerification}
            onChange={setGoogleSiteVerification}
            maxLength={200}
            hint="貼上 HTML 標籤驗證的 content 值（google-site-verification）"
            placeholder="例如：AbCdEf123..."
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
