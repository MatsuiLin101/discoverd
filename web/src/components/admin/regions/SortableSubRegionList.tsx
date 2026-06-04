"use client";

import { useState } from "react";
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
import DeleteSubRegionButton from "./DeleteSubRegionButton";

interface SubRegion {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  _count: { tours: number };
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

function SortableRow({ sub, regionId }: { sub: SubRegion; regionId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id });

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
        <div className="relative w-16 h-12 overflow-hidden bg-gray-100 rounded-md">
          <Image
            src={sub.thumbnail ?? "/images/region-default.svg"}
            alt={sub.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800">{sub.name}</td>
      <td className="px-4 py-3 text-gray-500 break-all">{sub.slug}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{sub._count.tours} 個</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/regions/${regionId}/subs/${sub.id}`}
            className="whitespace-nowrap rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            編輯
          </Link>
          <DeleteSubRegionButton
            regionId={regionId}
            subId={sub.id}
            tourCount={sub._count.tours}
          />
        </div>
      </td>
    </tr>
  );
}

export default function SortableSubRegionList({
  regionId,
  subs: initial,
}: {
  regionId: string;
  subs: SubRegion[];
}) {
  const [subs, setSubs] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subs.findIndex((s) => s.id === active.id);
    const newIndex = subs.findIndex((s) => s.id === over.id);
    const prev = subs;
    const next = arrayMove(subs, oldIndex, newIndex);
    setSubs(next);
    setError(null);

    try {
      const res = await fetch(`/api/admin/regions/${regionId}/subs/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((s, i) => ({ id: s.id, sortOrder: i })),
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSubs(prev);
      setError("排序儲存失敗，已還原");
    }
  }

  return (
    <div>
      {error && (
        <p className="px-4 py-2 mb-3 text-sm rounded-lg bg-rose-50 text-rose-600">{error}</p>
      )}

      {/* 手機卡片（靜態，不含拖曳） */}
      <div className="min-[920px]:hidden space-y-2">
        {subs.length === 0 && (
          <p className="px-4 py-12 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
            尚無次分類，請新增
          </p>
        )}
        {subs.map((sub) => (
          <div key={sub.id} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-20 h-16 overflow-hidden bg-gray-100 rounded-lg shrink-0">
                <Image
                  src={sub.thumbnail ?? "/images/region-default.svg"}
                  alt={sub.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{sub.name}</p>
                <p className="my-1 text-xs text-gray-400 break-all">{sub.slug}</p>
                <p className="text-xs text-gray-400">{sub._count.tours} 個旅遊方案</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <Link
                href={`/admin/regions/${regionId}/subs/${sub.id}`}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
              >
                編輯
              </Link>
              <DeleteSubRegionButton
                regionId={regionId}
                subId={sub.id}
                tourCount={sub._count.tours}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 桌機表格（含拖曳排序） */}
      <DndContext
        id="subs-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden min-[920px]:block overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-150">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">縮圖</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">顯示名稱</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">旅遊方案</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <SortableContext
              items={subs.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-sm text-center text-gray-400">
                      尚無次分類，請新增
                    </td>
                  </tr>
                )}
                {subs.map((sub) => (
                  <SortableRow key={sub.id} sub={sub} regionId={regionId} />
                ))}
              </tbody>
            </SortableContext>
          </table>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
