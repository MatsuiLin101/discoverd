"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ImageLightbox from "@/components/admin/regions/ImageLightbox";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

interface Props {
  bannerId?: string;
  initialTitle?: string;
  initialImage?: string | null;
}

export default function HeroBannerForm({
  bannerId,
  initialTitle = "",
  initialImage,
}: Props) {
  const router = useRouter();
  const isEdit = !!bannerId;

  const [title, setTitle] = useState(initialTitle);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append("title", title);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append("image", file);

    try {
      const url = isEdit ? `/api/admin/hero-banners/${bannerId}` : "/api/admin/hero-banners";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: fd });
      const data = await res.json();
      if (data.data) {
        sessionStorage.setItem(
          "adminSaveMsg",
          isEdit ? `已更新輪播圖「${title}」` : `已新增輪播圖「${title}」`
        );
        router.push("/admin/hero-banners");
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

  const currentThumb = preview ?? initialImage ?? null;

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <div>
          <label className={labelClass}>
            標題（圖片 alt 文字）<span className="ml-0.5 text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="例：北海道 美瑛夏日"
          />
          <p className="mt-1 text-xs text-gray-400">用於描述圖片內容，同時作為無障礙 alt 屬性</p>
        </div>

        <div>
          <label className={labelClass}>
            輪播圖片{!isEdit && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {currentThumb ? (
              <div
                className="relative h-24 w-36 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 cursor-zoom-in shrink-0"
                onClick={() => setLightbox(currentThumb)}
              >
                <Image
                  src={currentThumb}
                  alt="圖片預覽"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative h-24 w-36 overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                <span className="text-xs text-gray-400">尚未選取</span>
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                required={!isEdit}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
              />
              {isEdit && (
                <p className="mt-1.5 text-xs text-gray-400">不選取則保留現有圖片</p>
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
            onClick={() => router.push("/admin/hero-banners")}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            返回列表
          </button>
        </div>
      </form>

      {lightbox && (
        <ImageLightbox src={lightbox} alt="圖片預覽" onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
