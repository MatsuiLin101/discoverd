"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeleteHeroBannerButton from "./DeleteHeroBannerButton";
import ImageLightbox from "@/components/admin/regions/ImageLightbox";
import FloatingToast from "@/components/admin/FloatingToast";

interface Banner {
  id: string;
  title: string;
  image: string;
  createdAt: Date;
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}

function SortableRow({
  banner,
  onImageClick,
  onDelete,
}: {
  banner: Banner;
  onImageClick: (src: string) => void;
  onDelete: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 ${isDragging ? "bg-blue-50 opacity-80 shadow-sm" : "hover:bg-gray-50"}`}
    >
      <td className="px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-300 cursor-grab touch-none hover:text-gray-500 active:cursor-grabbing"
          aria-label="拖曳排序"
        >
          <GripIcon />
        </button>
      </td>
      <td className="px-4 py-3">
        <div
          className="relative w-24 h-14 overflow-hidden bg-gray-100 rounded-md cursor-zoom-in"
          onClick={() => onImageClick(banner.image)}
        >
          <Image
            src={banner.image}
            alt={banner.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800">{banner.title}</td>
      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-sm">
        {new Date(banner.createdAt).toLocaleDateString("zh-TW")}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/hero-banners/${banner.id}`}
            className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            編輯
          </Link>
          <DeleteHeroBannerButton
            bannerId={banner.id}
            title={banner.title}
            onDelete={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

export default function SortableHeroBannerList({ banners: initial }: { banners: Banner[] }) {
  const [banners, setBanners] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const msg = sessionStorage.getItem("adminSaveMsg");
    if (msg) {
      sessionStorage.removeItem("adminSaveMsg");
      setSaveMsg(msg);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, []);

  function handleDeleted(id: string, title: string) {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    setSuccessMsg(`已刪除輪播圖「${title}」`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    const prev = banners;
    const next = arrayMove(banners, oldIndex, newIndex);
    setBanners(next);
    setError(null);

    try {
      const res = await fetch("/api/admin/hero-banners/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.map((b, i) => ({ id: b.id, sortOrder: i })) }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg("排序已更新");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setBanners(prev);
      setError("排序儲存失敗，已還原");
    }
  }

  return (
    <div>
      {/* 手機卡片 */}
      <div className="min-[920px]:hidden space-y-2">
        {banners.length === 0 && (
          <p className="px-4 py-12 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
            尚無輪播圖，請新增
          </p>
        )}
        {banners.map((banner) => (
          <div key={banner.id} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="relative w-24 h-16 overflow-hidden bg-gray-100 rounded-lg shrink-0 cursor-zoom-in"
                onClick={() => setLightbox(banner.image)}
              >
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{banner.title}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(banner.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <Link
                href={`/admin/hero-banners/${banner.id}`}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                編輯
              </Link>
              <DeleteHeroBannerButton
                bannerId={banner.id}
                title={banner.title}
                onDelete={(title) => handleDeleted(banner.id, title)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 桌機表格（含拖曳排序） */}
      <DndContext
        id="hero-banners-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden min-[920px]:block overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 bg-gray-50">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">圖片</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">標題 / Alt</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">建立日期</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {banners.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-sm text-center text-gray-400">
                        尚無輪播圖，請新增
                      </td>
                    </tr>
                  )}
                  {banners.map((banner) => (
                    <SortableRow
                      key={banner.id}
                      banner={banner}
                      onImageClick={setLightbox}
                      onDelete={(title) => handleDeleted(banner.id, title)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </div>
      </DndContext>

      {lightbox && (
        <ImageLightbox src={lightbox} alt="輪播圖預覽" onClose={() => setLightbox(null)} />
      )}
      <FloatingToast saveMsg={saveMsg} successMsg={successMsg} errorMsg={error} />
    </div>
  );
}
