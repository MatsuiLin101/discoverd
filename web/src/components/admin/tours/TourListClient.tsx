"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeleteTourButton from "./DeleteTourButton";

type TourRow = {
  id: string;
  name: string;
  thumbnail: string | null;
  price: number;
  published: boolean;
  sortOrder: number;
  subRegion: {
    name: string;
    region: { name: string };
  };
  tags: { id: string; name: string }[];
  _count: { files: number };
};

type TagOption = { id: string; name: string };

type RegionOption = {
  id: string;
  name: string;
  subRegions: { id: string; name: string }[];
};

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

function TourMobileCard({
  tour,
  isSelected,
  onToggle,
}: {
  tour: TourRow;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 ${
        isSelected ? "border-[#D12351] bg-rose-50/30" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(tour.id)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#D12351]"
        />
        <div className="relative h-10 overflow-hidden bg-gray-100 rounded w-14 shrink-0">
          <Image
            src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
            alt={tour.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug text-gray-800">{tour.name}</p>
            {tour.published ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                已發布
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                未發布
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {tour.subRegion.region.name} › {tour.subRegion.name}
          </p>
          <p className="mt-1 text-sm text-gray-700">NT${tour.price.toLocaleString()}</p>
          {tour.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tour.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Link
              href={`/admin/tours/${tour.id}`}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
            >
              編輯
            </Link>
            <DeleteTourButton tourId={tour.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SortableTourRowProps {
  tour: TourRow;
  isSelected: boolean;
  onToggle: (id: string) => void;
  showDragHandle: boolean;
}

function SortableTourRow({ tour, isSelected, onToggle, showDragHandle }: SortableTourRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tour.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 ${
        isDragging ? "bg-blue-50 opacity-80 shadow-sm" : "hover:bg-gray-50"
      }`}
    >
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(tour.id)}
          className="h-4 w-4 rounded border-gray-300 accent-[#D12351]"
        />
      </td>
      <td className="px-2 py-3">
        {showDragHandle ? (
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-300 cursor-grab touch-none hover:text-gray-500 active:cursor-grabbing"
            aria-label="拖曳排序"
          >
            <GripIcon />
          </button>
        ) : (
          <span className="inline-block w-6" />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative h-10 overflow-hidden bg-gray-100 rounded w-14">
          <Image
            src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
            alt={tour.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800">{tour.name}</td>
      <td className="px-4 py-3 text-gray-500">
        {tour.subRegion.region.name} › {tour.subRegion.name}
      </td>
      <td className="px-4 py-3 text-gray-700">NT${tour.price.toLocaleString()}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {tour.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tour._count.files} 個</td>
      <td className="px-4 py-3">
        {tour.published ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-600">
            已發布
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-500">
            未發布
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/tours/${tour.id}`}
            className="whitespace-nowrap rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            編輯
          </Link>
          <DeleteTourButton tourId={tour.id} />
        </div>
      </td>
    </tr>
  );
}

interface TourListClientProps {
  tours: TourRow[];
  tags: TagOption[];
  regions: RegionOption[];
  hasFilters: boolean;
  filteredCount: number;
  allCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  prevHref: string | null;
  nextHref: string | null;
}

export default function TourListClient({
  tours: initial,
  tags,
  regions,
  hasFilters,
  filteredCount,
  allCount,
  currentPage,
  totalPages,
  pageSize,
  prevHref,
  nextHref,
}: TourListClientProps) {
  const [tours, setTours] = useState(initial);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTours(initial);
    setSelectedIds(new Set());
  }, [initial]);

  // Batch tags state
  const [batchMode, setBatchMode] = useState<"add" | "remove" | null>(null);
  const [batchTagIds, setBatchTagIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Batch publish state
  const [publishLoading, setPublishLoading] = useState(false);

  // Batch delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Batch region state
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedSubRegionId, setSelectedSubRegionId] = useState("");
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const [dragError, setDragError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor));

  const canDrag = pageSize === 0 || filteredCount <= pageSize;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tours.findIndex((t) => t.id === active.id);
    const newIndex = tours.findIndex((t) => t.id === over.id);
    const prev = tours;
    const next = arrayMove(tours, oldIndex, newIndex);
    setTours(next);
    setDragError(null);

    try {
      const res = await fetch("/api/admin/tours/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.map((t, i) => ({ id: t.id, sortOrder: i })) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTours(prev);
      setDragError("排序儲存失敗，已還原");
    }
  }

  const allSelected = tours.length > 0 && tours.every((t) => selectedIds.has(t.id));
  const someSelected = tours.some((t) => selectedIds.has(t.id)) && !allSelected;

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(tours.map((t) => t.id)));
    else setSelectedIds(new Set());
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Batch tags
  function openBatchModal(mode: "add" | "remove") {
    setBatchMode(mode);
    setBatchTagIds(new Set());
    setBatchError(null);
    setTagSearch("");
  }

  const visibleTags = tagSearch
    ? tags.filter((t) => t.name.includes(tagSearch))
    : tags;

  function toggleBatchTag(id: string) {
    setBatchTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBatchTags() {
    if (batchTagIds.size === 0) {
      setBatchError("請選擇至少一個標籤");
      return;
    }
    setBatchLoading(true);
    setBatchError(null);
    try {
      const res = await fetch("/api/admin/tours/batch-tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourIds: Array.from(selectedIds),
          action: batchMode,
          tagIds: Array.from(batchTagIds),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBatchError(data.error ?? "操作失敗");
        return;
      }
      setBatchMode(null);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setBatchError("操作失敗，請重試");
    } finally {
      setBatchLoading(false);
    }
  }

  // Batch publish
  async function applyBatchPublish(published: boolean) {
    setPublishLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tours/batch-publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourIds: Array.from(selectedIds), published }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "操作失敗");
        return;
      }
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setActionError("操作失敗，請重試");
    } finally {
      setPublishLoading(false);
    }
  }

  // Batch delete
  async function applyBatchDelete() {
    setDeleteLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/tours/batch-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "刪除失敗");
        setDeleteConfirmOpen(false);
        return;
      }
      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setActionError("刪除失敗，請重試");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Batch region
  function openRegionModal() {
    setRegionModalOpen(true);
    setSelectedRegionId("");
    setSelectedSubRegionId("");
    setRegionError(null);
  }

  async function applyBatchRegion() {
    if (!selectedSubRegionId) {
      setRegionError("請選擇次分類");
      return;
    }
    setRegionLoading(true);
    setRegionError(null);
    try {
      const res = await fetch("/api/admin/tours/batch-region", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourIds: Array.from(selectedIds),
          subRegionId: selectedSubRegionId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRegionError(data.error ?? "操作失敗");
        return;
      }
      setRegionModalOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      setRegionError("操作失敗，請重試");
    } finally {
      setRegionLoading(false);
    }
  }

  const subRegionsForModal =
    regions.find((r) => r.id === selectedRegionId)?.subRegions ?? [];

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#D12351]/20 bg-rose-50 px-4 py-2">
          <span className="text-sm font-medium text-[#D12351]">
            已選取 {selectedIds.size} 個方案
          </span>
          <button
            onClick={() => openBatchModal("add")}
            className="rounded-md border border-[#D12351] px-3 py-1 text-xs font-medium text-[#D12351] transition-colors hover:bg-[#D12351] hover:text-white"
          >
            批次新增標籤
          </button>
          <button
            onClick={() => openBatchModal("remove")}
            className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors border border-gray-300 rounded-md hover:bg-gray-100"
          >
            批次移除標籤
          </button>
          <button
            onClick={openRegionModal}
            className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors border border-gray-300 rounded-md hover:bg-gray-100"
          >
            批次更改分類
          </button>
          <button
            onClick={() => applyBatchPublish(true)}
            disabled={publishLoading}
            className="px-3 py-1 text-xs font-medium transition-colors border rounded-md border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            批次發布
          </button>
          <button
            onClick={() => applyBatchPublish(false)}
            disabled={publishLoading}
            className="px-3 py-1 text-xs font-medium text-gray-600 transition-colors border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            批次取消發布
          </button>
          <button
            onClick={() => { setDeleteConfirmOpen(true); setActionError(null); }}
            className="px-3 py-1 text-xs font-medium transition-colors border rounded-md border-rose-300 text-rose-600 hover:bg-rose-50"
          >
            批次刪除
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            取消選取
          </button>
        </div>
      )}

      {actionError && (
        <p className="px-4 py-2 mb-2 text-sm rounded-lg bg-rose-50 text-rose-600">{actionError}</p>
      )}

      {!canDrag && (
        <p className="mb-2 text-xs text-gray-400">
          目前篩選結果有多頁，請選擇「全部」顯示才可拖曳排序
        </p>
      )}
      {dragError && (
        <p className="px-4 py-2 mb-2 text-sm rounded-lg bg-rose-50 text-rose-600">{dragError}</p>
      )}

      {/* 手機卡片 */}
      <div className="min-[1165px]:hidden space-y-2">
        {tours.length === 0 && (
          <p className="px-4 py-12 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
            沒有符合條件的旅遊方案
          </p>
        )}
        {tours.map((tour) => (
          <TourMobileCard
            key={tour.id}
            tour={tour}
            isSelected={selectedIds.has(tour.id)}
            onToggle={toggleOne}
          />
        ))}
      </div>

      {/* 桌機表格（含拖曳排序） */}
      <DndContext
        id="tours-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden min-[1165px]:block overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-215">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el: HTMLInputElement | null) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-[#D12351]"
                  />
                </th>
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">縮圖</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">名稱</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">分類</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">價格</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">標籤</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">檔案</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">狀態</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <SortableContext items={tours.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {tours.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-sm text-center text-gray-400">
                      沒有符合條件的旅遊方案
                    </td>
                  </tr>
                )}
                {tours.map((tour) => (
                  <SortableTourRow
                    key={tour.id}
                    tour={tour}
                    isSelected={selectedIds.has(tour.id)}
                    onToggle={toggleOne}
                    showDragHandle={canDrag}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
          </div>
        </div>
      </DndContext>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            第 {currentPage} / {totalPages} 頁（篩選後共 {filteredCount} 筆）
          </p>
          <div className="flex gap-2">
            {prevHref ? (
              <Link
                href={prevHref}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                « 上一頁
              </Link>
            ) : (
              <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-300">
                « 上一頁
              </span>
            )}
            {nextHref ? (
              <Link
                href={nextHref}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                下一頁 »
              </Link>
            ) : (
              <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-300">
                下一頁 »
              </span>
            )}
          </div>
        </div>
      )}

      {/* Batch tags modal */}
      {batchMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm p-6 mx-4 bg-white shadow-xl rounded-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-800">
              {batchMode === "add" ? "批次新增標籤" : "批次移除標籤"}
            </h3>
            <p className="mb-4 text-sm text-gray-500">對象：{selectedIds.size} 個方案</p>

            {tags.length > 5 && (
              <input
                type="search"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="搜尋標籤…"
                className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
              />
            )}

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">已選 {batchTagIds.size} 個標籤</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setBatchTagIds(new Set(visibleTags.map((t) => t.id)))}
                  className="text-xs text-[#D12351] hover:underline"
                >
                  全選
                </button>
                <button
                  onClick={() => setBatchTagIds(new Set())}
                  className="text-xs text-gray-400 hover:underline"
                >
                  取消全選
                </button>
              </div>
            </div>

            <div className="p-2 mb-4 space-y-2 overflow-y-auto border border-gray-100 rounded-lg max-h-52">
              {visibleTags.length === 0 && (
                <p className="text-sm text-gray-400">
                  {tagSearch ? "沒有符合的標籤" : "尚無標籤"}
                </p>
              )}
              {visibleTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={batchTagIds.has(tag.id)}
                    onChange={() => toggleBatchTag(tag.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-[#D12351]"
                  />
                  <span className="text-sm text-gray-700">{tag.name}</span>
                </label>
              ))}
            </div>

            {batchError && <p className="mb-3 text-sm text-rose-600">{batchError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBatchMode(null)}
                disabled={batchLoading}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={applyBatchTags}
                disabled={batchLoading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: "#D12351" }}
              >
                {batchLoading
                  ? "處理中…"
                  : batchMode === "add"
                  ? `新增至 ${selectedIds.size} 個方案`
                  : `從 ${selectedIds.size} 個方案移除`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch region modal */}
      {regionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm p-6 mx-4 bg-white shadow-xl rounded-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-800">批次更改分類</h3>
            <p className="mb-4 text-sm text-gray-500">對象：{selectedIds.size} 個方案</p>

            <div className="flex flex-col gap-1 mb-3">
              <label className="text-xs font-medium text-gray-500">主分類</label>
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setSelectedSubRegionId("");
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
              >
                <option value="">請選擇主分類</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-xs font-medium text-gray-500">次分類</label>
              <select
                value={selectedSubRegionId}
                onChange={(e) => setSelectedSubRegionId(e.target.value)}
                disabled={!selectedRegionId}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351] disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">請選擇次分類</option>
                {subRegionsForModal.map((sr) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.name}
                  </option>
                ))}
              </select>
            </div>

            {regionError && <p className="mb-3 text-sm text-rose-600">{regionError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRegionModalOpen(false)}
                disabled={regionLoading}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={applyBatchRegion}
                disabled={regionLoading || !selectedSubRegionId}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: "#D12351" }}
              >
                {regionLoading ? "處理中…" : `更改 ${selectedIds.size} 個方案的分類`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirm modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm p-6 mx-4 bg-white shadow-xl rounded-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-800">確認批次刪除</h3>
            <p className="mb-1 text-sm text-gray-700">
              確定要刪除 <span className="font-semibold text-rose-600">{selectedIds.size} 個方案</span>？
            </p>
            <p className="mb-5 text-sm text-gray-500">
              刪除後無法復原，相關圖片與檔案也會一併刪除。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={applyBatchDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteLoading ? "刪除中…" : `刪除 ${selectedIds.size} 個方案`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
