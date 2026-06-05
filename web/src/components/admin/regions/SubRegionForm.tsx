"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageLightbox from "./ImageLightbox";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
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
}

export default function SubRegionForm({
  regionId,
  regionName,
  subId,
  initialName = "",
  initialSlug = "",
  initialThumbnail,
}: Props) {
  const router = useRouter();
  const isEdit = !!subId;

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [preview, setPreview] = useState<string | null>(null);
  const [clearThumbnail, setClearThumbnail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    if (!slugManual) setSlug(autoSlug(val));
  }

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugManual(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClearThumbnail(false);
    setPreview(URL.createObjectURL(file));
  }

  function handleClearThumbnail() {
    setClearThumbnail(true);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
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
    const file = fileRef.current?.files?.[0];
    if (file) {
      fd.append("thumbnail", file);
    } else if (clearThumbnail) {
      fd.append("clearThumbnail", "true");
    }

    try {
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
        router.push(`/admin/regions/${regionId}/subs`);
        router.refresh();
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
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

      <div>
        <label className={labelClass}>顯示名稱<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={name}
          onChange={handleNameChange}
          className={inputClass}
          placeholder="例：東京"
        />
      </div>

      <div>
        <label className={labelClass}>Slug（網址代碼）<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={slug}
          onChange={handleSlugChange}
          className={inputClass}
          placeholder="例：tokyo"
        />
        <p className="mt-1 text-xs text-gray-400">
          只允許小寫英文字母（a-z）、數字（0-9）、連字號（-），例：/{autoSlug(regionName) || "…"}/{slug || "tokyo"}
        </p>
      </div>

      <div>
        <label className={labelClass}>縮圖</label>
        <div className="flex items-start gap-4">
          <div
            className={`relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-50${currentThumb ? " cursor-zoom-in" : ""}`}
            onClick={currentThumb ? () => setLightbox(displayThumbnail) : undefined}
          >
            <Image
              src={displayThumbnail}
              alt="縮圖預覽"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
            />
            <p className="mt-1.5 text-xs text-gray-400">未上傳時使用預設縮圖</p>
            {showClearButton && (
              <button
                type="button"
                onClick={handleClearThumbnail}
                className="mt-1.5 cursor-pointer text-xs text-rose-500 hover:text-rose-700"
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
          onClick={() => router.push(`/admin/regions/${regionId}/subs`)}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          返回列表
        </button>
      </div>
    </form>
    {lightbox && <ImageLightbox src={lightbox} alt="縮圖預覽" onClose={() => setLightbox(null)} />}
    </>
  );
}
