"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TourFileList from "./TourFileList";
import ImageLightbox from "@/components/admin/regions/ImageLightbox";

interface SubRegion {
  id: string;
  name: string;
}

interface Region {
  id: string;
  name: string;
  subRegions: SubRegion[];
}

interface Tag {
  id: string;
  name: string;
}

interface Tour {
  id: string;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  subRegionId: string;
  tags: { id: string }[];
}

interface TourFileItem {
  id: string;
  url: string;
  mimeType: string;
  filename?: string | null;
  sortOrder: number;
}

interface Props {
  tour?: Tour;
  regions: Region[];
  tags: Tag[];
  tourId?: string;
  initialFiles?: TourFileItem[];
  returnUrl?: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
const fileInputClass =
  "block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100";

export default function TourForm({ tour, regions, tags, tourId, initialFiles, returnUrl }: Props) {
  const router = useRouter();
  const isEdit = !!tour;
  const backUrl = returnUrl ?? "/admin/tours";
  const contentFilesInputRef = useRef<HTMLInputElement>(null);

  const initialRegionId = (() => {
    if (!tour) return "";
    const found = regions.find((r) => r.subRegions.some((s) => s.id === tour.subRegionId));
    return found?.id ?? "";
  })();

  const [name, setName] = useState(tour?.name ?? "");
  const [price, setPrice] = useState(tour?.price.toString() ?? "");
  const [description, setDescription] = useState(tour?.description ?? "");
  const [selectedRegionId, setSelectedRegionId] = useState(initialRegionId);
  const [subRegionId, setSubRegionId] = useState(tour?.subRegionId ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    tour?.tags.map((t) => t.id) ?? []
  );
  const [published, setPublished] = useState(tour?.published ?? false);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [clearThumbnail, setClearThumbnail] = useState(false);
  const [contentFiles, setContentFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filteredSubRegions =
    regions.find((r) => r.id === selectedRegionId)?.subRegions ?? [];

  function handleRegionChange(regionId: string) {
    setSelectedRegionId(regionId);
    setSubRegionId("");
  }

  function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setThumbFile(file);
    setThumbPreview(file ? URL.createObjectURL(file) : null);
    if (file) setClearThumbnail(false);
  }

  function handleClearThumbnail() {
    setClearThumbnail(true);
    setThumbFile(null);
    setThumbPreview(null);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleContentFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    if (newFiles.length === 0) return;
    setContentFiles((prev) => [...prev, ...newFiles]);
    if (contentFilesInputRef.current) contentFilesInputRef.current.value = "";
  }

  function removeContentFile(index: number) {
    setContentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subRegionId) {
      setError("請選擇次分類");
      return;
    }
    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append("name", name);
    fd.append("price", price);
    fd.append("description", description);
    fd.append("subRegionId", subRegionId);
    fd.append("published", published ? "true" : "false");
    selectedTagIds.forEach((id) => fd.append("tagIds", id));
    if (thumbFile) {
      fd.append("thumbnail", thumbFile);
    } else if (clearThumbnail) {
      fd.append("clearThumbnail", "true");
    }
    if (!isEdit) {
      contentFiles.forEach((f) => fd.append("contentFiles", f));
    }

    try {
      const url = isEdit ? `/api/admin/tours/${tour.id}` : "/api/admin/tours";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.data) {
        sessionStorage.setItem(
          "adminSaveMsg",
          isEdit ? `已更新旅遊方案「${name}」` : `已新增旅遊方案「${name}」`
        );
        router.push(backUrl);
        router.refresh();
      } else {
        setError(data.error ?? (isEdit ? "儲存失敗" : "新增失敗"));
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  const currentThumb = clearThumbnail ? null : (thumbPreview ?? tour?.thumbnail ?? null);
  const showClearButton = isEdit && (!!tour?.thumbnail || !!thumbFile) && !clearThumbnail;
  const canOpenLightbox = !!currentThumb;

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* 行程名稱 */}
        <div>
          <label className={labelClass}>行程名稱</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="例如：日本東京 5 日遊"
          />
        </div>

        {/* 價格 */}
        <div>
          <label className={labelClass}>價格（NT$）</label>
          <input
            type="number"
            required
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="例如：29800"
          />
        </div>

        {/* 行程簡介 */}
        <div>
          <label className={labelClass}>行程簡介</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="簡短描述此行程的特色（選填）"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-400">最多 500 字</p>
        </div>

        {/* 主分類 / 次分類 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>主分類</label>
            <select
              value={selectedRegionId}
              onChange={(e) => handleRegionChange(e.target.value)}
              className={inputClass}
            >
              <option value="">請選擇主分類</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>次分類</label>
            <select
              value={subRegionId}
              onChange={(e) => setSubRegionId(e.target.value)}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
              disabled={!selectedRegionId}
            >
              <option value="">請選擇次分類</option>
              {filteredSubRegions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 標籤 */}
        {tags.length > 0 && (
          <div>
            <label className={labelClass}>標籤（可多選）</label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 bg-gray-50 p-3">
              {tags.map((tag) => {
                const checked = selectedTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-[#D12351] bg-rose-50 text-[#D12351]"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => toggleTag(tag.id)}
                    />
                    {tag.name}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 行程縮圖 */}
        <div>
          <label className={labelClass}>行程縮圖</label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className={`relative h-24 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200${canOpenLightbox ? " cursor-zoom-in" : ""}`}
              onClick={canOpenLightbox ? () => setLightbox(currentThumb!) : undefined}
            >
              <Image
                src={currentThumb ?? "/images/tour-placeholder.svg"}
                alt="縮圖預覽"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbChange}
                className={fileInputClass}
              />
              {showClearButton && (
                <button
                  type="button"
                  onClick={handleClearThumbnail}
                  className="cursor-pointer text-xs text-rose-500 hover:text-rose-700"
                >
                  清除縮圖
                </button>
              )}
              {clearThumbnail && (
                <p className="text-xs text-gray-400">縮圖將被清除，儲存後生效</p>
              )}
              <p className="text-xs text-gray-400">
                支援 JPG、PNG、WebP；未上傳時顯示預設縮圖
                {canOpenLightbox && "；點擊縮圖可放大預覽"}
              </p>
            </div>
          </div>
        </div>

        {/* 新增時的行程內容 */}
        {!isEdit && (
          <div>
            <label className={labelClass}>行程內容（可在儲存後繼續管理）</label>
            <div className="space-y-2">
              {contentFiles.length > 0 && (
                <ul className="space-y-1.5 rounded-lg border border-gray-300 bg-gray-50 p-3">
                  {contentFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-gray-700">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeContentFile(i)}
                        className="ml-2 flex-shrink-0 cursor-pointer text-xs text-rose-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={contentFilesInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleContentFilesChange}
                className={fileInputClass}
              />
              <p className="text-xs text-gray-400">
                支援圖片與 PDF，可多選；重複點擊可從不同資料夾繼續新增
              </p>
            </div>
          </div>
        )}

        {/* 編輯時的行程內容 */}
        {isEdit && tourId && (
          <div>
            <label className={labelClass}>行程內容</label>
            <p className="mb-3 text-sm text-gray-500">可上傳圖片或 PDF，拖曳調整展示順序。</p>
            <TourFileList tourId={tourId} initialFiles={initialFiles ?? []} />
          </div>
        )}

        {/* 發布狀態 */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-[#D12351]"
          />
          <label htmlFor="published" className="cursor-pointer text-sm font-medium text-gray-700">
            已發布
          </label>
          <span className="text-xs text-gray-400">
            {published ? "前台可見" : "前台隱藏"}
          </span>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            {isPending
              ? isEdit
                ? "儲存中…"
                : "新增中…"
              : isEdit
                ? "儲存變更"
                : "新增旅遊方案"}
          </button>
          <button
            type="button"
            onClick={() => router.push(backUrl)}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            {isEdit ? "返回列表" : "取消"}
          </button>
        </div>
      </form>

      {lightbox && (
        <ImageLightbox src={lightbox} alt="縮圖預覽" onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
