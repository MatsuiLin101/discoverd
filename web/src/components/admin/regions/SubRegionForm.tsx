"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageLightbox from "./ImageLightbox";
import ImageCropper from "@/components/admin/ImageCropper";
import CroppedPreview from "@/components/admin/CroppedPreview";
import { uploadFile } from "@/lib/upload-client";
import { useAdminPath } from "@/components/admin/AdminPathProvider";
import CharCountField from "@/components/admin/CharCountField";
import type { ThumbCrop } from "@/lib/crop";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

interface Props {
  regionId: string;
  regionName: string;
  subId?: string;
  initialName?: string;
  initialSlug?: string;
  initialThumbnail?: string | null;
  initialThumbnailCrop?: ThumbCrop | null;
  initialSeoTitle?: string | null;
  initialSeoDescription?: string | null;
  initialOgImage?: string | null;
}

export default function SubRegionForm({
  regionId,
  regionName,
  subId,
  initialName = "",
  initialSlug = "",
  initialThumbnail,
  initialThumbnailCrop,
  initialSeoTitle,
  initialSeoDescription,
  initialOgImage,
}: Props) {
  const router = useRouter();
  const adminPath = useAdminPath();
  const isEdit = !!subId;

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [preview, setPreview] = useState<string | null>(null);
  const [clearThumbnail, setClearThumbnail] = useState(false);
  const [thumbnailCrop, setThumbnailCrop] = useState<ThumbCrop | null>(initialThumbnailCrop ?? null);
  const [showCropper, setShowCropper] = useState(false);
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription ?? "");
  const [ogPreview, setOgPreview] = useState<string | null>(null);
  const [clearOgImage, setClearOgImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(autoSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClearThumbnail(false);
    setPreview(URL.createObjectURL(file));
    setThumbnailCrop(null); // a new image invalidates any previous crop coords
  }

  function handleClearThumbnail() {
    setClearThumbnail(true);
    setPreview(null);
    setThumbnailCrop(null);
    if (fileRef.current) fileRef.current.value = "";
  }

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
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug 只允許小寫英文字母（a-z）、數字（0-9）和連字號（-），不可使用中文、大寫或特殊符號");
      return;
    }
    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("seoTitle", seoTitle);
    fd.append("seoDescription", seoDescription);
    const file = fileRef.current?.files?.[0];
    const ogFile = ogFileRef.current?.files?.[0];

    try {
      if (file) {
        const up = await uploadFile(file, "regions");
        fd.append("thumbnailKey", up.key);
      } else if (clearThumbnail) {
        fd.append("clearThumbnail", "true");
      }
      if (thumbnailCrop && !clearThumbnail) {
        fd.append("thumbnailCrop", JSON.stringify(thumbnailCrop));
      }
      if (ogFile) {
        const up = await uploadFile(ogFile, "seo-og/subregions");
        fd.append("ogImageKey", up.key);
      } else if (clearOgImage) {
        fd.append("clearOgImage", "true");
      }

      const url = isEdit
        ? `/api/admin/regions/${regionId}/subs/${subId}`
        : `/api/admin/regions/${regionId}/subs`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (data.data) {
        sessionStorage.setItem(
          "adminSaveMsg",
          isEdit ? `已更新次分類「${name}」` : `已新增次分類「${name}」`
        );
        router.push(`${adminPath}/regions/${regionId}/subs`);
        router.refresh();
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  const showClearButton = isEdit && (!!initialThumbnail || !!preview) && !clearThumbnail;
  const currentThumb = clearThumbnail ? null : (preview ?? initialThumbnail ?? null);
  const displayThumbnail = currentThumb ?? "/images/region-default.svg";

  return (
    <>
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div>
        <label className={labelClass}>所屬主分類</label>
        <div className="w-full cursor-default select-none rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
          {regionName}
        </div>
      </div>

      <CharCountField
        label="顯示名稱"
        required
        value={name}
        onChange={handleNameChange}
        maxLength={30}
        placeholder="例：東京"
      />

      <CharCountField
        label="Slug（網址代碼）"
        required
        value={slug}
        onChange={handleSlugChange}
        maxLength={50}
        placeholder="例：tokyo"
        hint={`只允許小寫英文字母（a-z）、數字（0-9）、連字號（-），例：/${autoSlug(regionName) || "…"}/${slug || "tokyo"}`}
      />

      <div>
        <label className={labelClass}>縮圖<span className="ml-2 text-xs font-normal text-gray-400">前台以 16:9 顯示</span></label>
        <div className="flex items-start gap-4">
          {currentThumb ? (
            <CroppedPreview
              src={currentThumb}
              alt="縮圖預覽"
              crop={thumbnailCrop}
              className="aspect-video w-44 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 cursor-zoom-in"
              onClick={() => setLightbox(displayThumbnail)}
            />
          ) : (
            <div className="relative aspect-video w-44 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <Image
                src={displayThumbnail}
                alt="縮圖預覽"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
            />
            <div className="mt-1.5 flex items-center gap-3">
              {currentThumb && (
                <button
                  type="button"
                  onClick={() => setShowCropper(true)}
                  className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {thumbnailCrop ? "重新裁切" : "調整裁切"}
                </button>
              )}
              {thumbnailCrop && (
                <button
                  type="button"
                  onClick={() => setThumbnailCrop(null)}
                  className="cursor-pointer text-xs text-gray-400 hover:text-gray-600"
                >
                  取消裁切
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">未上傳時使用預設縮圖；建議原圖至少 1280×720</p>
            {showClearButton && (
              <button
                type="button"
                onClick={handleClearThumbnail}
                className="mt-1.5 block cursor-pointer text-xs text-rose-500 hover:text-rose-700"
              >
                清除縮圖
              </button>
            )}
            {clearThumbnail && (
              <p className="mt-1.5 text-xs text-gray-400">縮圖將被清除，儲存後生效</p>
            )}
          </div>
        </div>
      </div>

      {/* SEO 設定 */}
      <details className="group rounded-lg border border-gray-200 bg-gray-50">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900">
          SEO 設定 <span className="text-xs font-normal text-gray-400">（選填）</span>
        </summary>
        <div className="space-y-4 border-t border-gray-200 px-4 py-4">
          <CharCountField
            label="SEO 標題"
            value={seoTitle}
            onChange={setSeoTitle}
            maxLength={100}
            placeholder="留空則自動使用：{名稱} ／ {主分類} — 找到了旅遊 FOUND HOLIDAY"
          />
          <CharCountField
            label="SEO 描述"
            multiline
            rows={3}
            value={seoDescription}
            onChange={setSeoDescription}
            maxLength={160}
            placeholder="留空則自動產生描述文字"
          />
          <div>
            <label className={labelClass}>OG 圖片（社群分享縮圖）</label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className={`relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-100${(ogPreview ?? initialOgImage) && !clearOgImage ? " cursor-zoom-in" : ""}`}
                onClick={(ogPreview ?? initialOgImage) && !clearOgImage ? () => setLightbox(ogPreview ?? initialOgImage!) : undefined}
              >
                <Image
                  src={clearOgImage ? "/images/region-default.svg" : (ogPreview ?? initialOgImage ?? "/images/region-default.svg")}
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
                  accept="image/*"
                  onChange={handleOgFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
                />
                <p className="mt-1.5 text-xs text-gray-400">留空則使用縮圖；建議尺寸 1200×630</p>
                {isEdit && (!!initialOgImage || !!ogPreview) && !clearOgImage && (
                  <button type="button" onClick={handleClearOgImage} className="mt-1.5 cursor-pointer text-xs text-rose-500 hover:text-rose-700">
                    清除 OG 圖片
                  </button>
                )}
                {clearOgImage && <p className="mt-1.5 text-xs text-gray-400">OG 圖片將被清除，儲存後生效</p>}
              </div>
            </div>
          </div>
        </div>
      </details>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#D12351" }}
        >
          {isPending ? "儲存中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`${adminPath}/regions/${regionId}/subs`)}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          返回列表
        </button>
      </div>
    </form>
    {lightbox && <ImageLightbox src={lightbox} alt="預覽" onClose={() => setLightbox(null)} />}
    {showCropper && currentThumb && (
      <ImageCropper
        src={currentThumb}
        aspect={16 / 9}
        value={thumbnailCrop}
        onApply={(crop) => {
          setThumbnailCrop(crop);
          setShowCropper(false);
        }}
        onCancel={() => setShowCropper(false)}
      />
    )}
    </>
  );
}
