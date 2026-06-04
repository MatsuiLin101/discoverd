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
import DeleteRegionButton from "./DeleteRegionButton";
import ImageLightbox from "./ImageLightbox";
import FloatingToast from "./FloatingToast";

interface Region {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  _count: { subRegions: number };
  tourCount: number;
  subRegionNames: string[];
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

function SortableRow({ region, onImageClick, onDelete }: { region: Region; onImageClick: (src: string) => void; onDelete: (name: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: region.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          className={`relative w-16 h-12 overflow-hidden bg-gray-100 rounded-md${region.thumbnail ? " cursor-zoom-in" : ""}`}
          onClick={region.thumbnail ? () => onImageClick(region.thumbnail!) : undefined}
        >
          <Image
            src={region.thumbnail ?? "/images/region-default.svg"}
            alt={region.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800">{region.name}</td>
      <td className="px-4 py-3 text-gray-500 break-all">{region.slug}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{region._count.subRegions} 個</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{region.tourCount} 個</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/regions/${region.id}/subs`}
            className="whitespace-nowrap rounded-md border border-[#D12351]/40 bg-rose-50 px-2.5 py-1 text-xs font-medium text-[#D12351] transition-colors hover:border-[#D12351] hover:bg-rose-100"
          >
            次分類
          </Link>
          <Link
            href={`/admin/regions/${region.id}`}
            className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            編輯
          </Link>
          <DeleteRegionButton
            regionId={region.id}
            name={region.name}
            subCount={region._count.subRegions}
            tourCount={region.tourCount}
            onDelete={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

export default function SortableRegionList({ regions: initial }: { regions: Region[] }) {
  const [regions, setRegions] = useState(initial);
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

  function handleRegionDeleted(id: string, name: string) {
    const target = regions.find(r => r.id === id);
    const names = target?.subRegionNames ?? [];
    setRegions(prev => prev.filter(r => r.id !== id));
    const msg = names.length > 0
      ? `已刪除主分類「${name}」及 ${names.length} 個次分類：${names.join('、')}`
      : `已刪除主分類「${name}」`;
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = regions.findIndex((r) => r.id === active.id);
    const newIndex = regions.findIndex((r) => r.id === over.id);
    const prev = regions;
    const next = arrayMove(regions, oldIndex, newIndex);
    setRegions(next);
    setError(null);

    try {
      const res = await fetch("/api/admin/regions/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((r, i) => ({ id: r.id, sortOrder: i })),
        }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg("排序已更新");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setRegions(prev);
      setError("排序儲存失敗，已還原");
    }
  }

  return (
    <div>

      {/* 手機卡片（靜態，不含拖曳） */}
      <div className="min-[920px]:hidden space-y-2">
        {regions.length === 0 && (
          <p className="px-4 py-12 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
            尚無資料，請新增主分類
          </p>
        )}
        {regions.map((region) => (
          <div key={region.id} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`relative w-20 h-16 overflow-hidden bg-gray-100 rounded-lg shrink-0${region.thumbnail ? " cursor-zoom-in" : ""}`}
                onClick={region.thumbnail ? () => setLightbox(region.thumbnail!) : undefined}
              >
                <Image
                  src={region.thumbnail ?? "/images/region-default.svg"}
                  alt={region.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{region.name}</p>
                <p className="my-1 text-xs text-gray-400 break-all">{region.slug}</p>
                <p className="text-xs text-gray-400">{region._count.subRegions} 個次分類</p>
                <p className="text-xs text-gray-400">{region.tourCount} 個旅遊方案</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <Link
                href={`/admin/regions/${region.id}/subs`}
                className="rounded-md border border-[#D12351]/40 bg-rose-50 px-2.5 py-1 text-xs font-medium text-[#D12351] transition-colors hover:border-[#D12351] hover:bg-rose-100"
              >
                次分類
              </Link>
              <Link
                href={`/admin/regions/${region.id}`}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                編輯
              </Link>
              <DeleteRegionButton
                regionId={region.id}
                name={region.name}
                subCount={region._count.subRegions}
                tourCount={region.tourCount}
                onDelete={(name) => handleRegionDeleted(region.id, name)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 桌機表格（含拖曳排序） */}
      <DndContext
        id="regions-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden min-[920px]:block overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-160">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">縮圖</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">顯示名稱</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">次分類</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">旅遊方案</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <SortableContext
              items={regions.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {regions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-sm text-center text-gray-400">
                      尚無資料，請新增主分類
                    </td>
                  </tr>
                )}
                {regions.map((region) => (
                  <SortableRow
                    key={region.id}
                    region={region}
                    onImageClick={setLightbox}
                    onDelete={(name) => handleRegionDeleted(region.id, name)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
          </div>
        </div>
      </DndContext>
      {lightbox && <ImageLightbox src={lightbox} alt="縮圖預覽" onClose={() => setLightbox(null)} />}
      <FloatingToast errorMsg={error} saveMsg={saveMsg} successMsg={successMsg} />
    </div>
  );
}
