"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
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
import FloatingToast from "@/components/admin/regions/FloatingToast";
import { useAdminPath } from "@/components/admin/AdminPathProvider";

interface SalesRegion {
  id: string;
  name: string;
  agentCount: number;
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

function SortableRegionCard({
  region,
  onRenamed,
  onDeleted,
}: {
  region: SalesRegion;
  onRenamed: (id: string, name: string) => void;
  onDeleted: (id: string, name: string) => void;
}) {
  const adminPath = useAdminPath();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: region.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(region.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = { transform: CSS.Transform.toString(transform), transition };

  async function saveRename(e: FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) {
      setError("請輸入地區名稱");
      return;
    }
    if (name === region.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/regions/${region.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        onRenamed(region.id, data.data.name);
        setEditing(false);
      } else {
        setError(data.error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const msg =
      region.agentCount > 0
        ? `此地區下有 ${region.agentCount} 張業務名片，刪除後將一併刪除。確定要刪除嗎？`
        : "確定要刪除此地區嗎？";
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sales/regions/${region.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(region.id, region.name);
      } else {
        const data = await res.json();
        setError(data.error ?? "刪除失敗");
        setBusy(false);
      }
    } catch {
      setError("網路錯誤");
      setBusy(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 ${
        isDragging ? "shadow-md opacity-80" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-300 cursor-grab touch-none hover:text-gray-500 active:cursor-grabbing"
        aria-label="拖曳排序"
      >
        <GripIcon />
      </button>

      {editing ? (
        <form onSubmit={saveRename} className="flex flex-1 items-center gap-2 min-w-0">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={50}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D12351] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            {busy ? "儲存中…" : "儲存"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(region.name);
              setError(null);
            }}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
        </form>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{region.name}</p>
            <p className="text-xs text-gray-400">{region.agentCount} 張名片</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`${adminPath}/sales/${region.id}`}
              className="whitespace-nowrap rounded-md border border-[#D12351]/40 bg-rose-50 px-2.5 py-1 text-xs font-medium text-[#D12351] transition-colors hover:border-[#D12351] hover:bg-rose-100"
            >
              管理名片
            </Link>
            <button
              onClick={() => setEditing(true)}
              className="whitespace-nowrap cursor-pointer rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              編輯名稱
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="whitespace-nowrap cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              刪除
            </button>
          </div>
        </>
      )}
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function SortableSalesRegionList({
  regions: initial,
}: {
  regions: SalesRegion[];
}) {
  const [regions, setRegions] = useState(initial);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  function flashSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setAddError("請輸入地區名稱");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/sales/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setRegions((prev) => [...prev, { id: data.data.id, name: data.data.name, agentCount: 0 }]);
        setNewName("");
        flashSuccess(`已新增地區「${data.data.name}」`);
      } else {
        setAddError(data.error ?? "新增失敗");
      }
    } catch {
      setAddError("網路錯誤");
    } finally {
      setAdding(false);
    }
  }

  function handleRenamed(id: string, name: string) {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
    flashSuccess(`已更新地區名稱「${name}」`);
  }

  function handleDeleted(id: string, name: string) {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    flashSuccess(`已刪除地區「${name}」`);
  }

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
      const res = await fetch("/api/admin/sales/regions/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.map((r, i) => ({ id: r.id, sortOrder: i })) }),
      });
      if (!res.ok) throw new Error();
      flashSuccess("排序已更新");
    } catch {
      setRegions(prev);
      setError("排序儲存失敗，已還原");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={50}
            placeholder="輸入地區名稱，例：台北"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent"
          />
          {addError && <p className="mt-1 text-xs text-rose-600">{addError}</p>}
        </div>
        <button
          type="submit"
          disabled={adding}
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          {adding ? "新增中…" : "新增地區"}
        </button>
      </form>

      <DndContext
        id="sales-regions-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={regions.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {regions.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
                尚無地區，請於上方新增
              </p>
            )}
            {regions.map((region) => (
              <SortableRegionCard
                key={region.id}
                region={region}
                onRenamed={handleRenamed}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <FloatingToast errorMsg={error} successMsg={successMsg} />
    </div>
  );
}
