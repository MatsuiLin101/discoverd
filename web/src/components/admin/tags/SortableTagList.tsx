"use client";

import { useState, useEffect } from "react";
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
import DeleteTagButton from "./DeleteTagButton";
import FloatingToast from "@/components/admin/FloatingToast";

interface Tag {
  id: string;
  name: string;
  tourCount: number;
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
  tag,
  onDelete,
}: {
  tag: Tag;
  onDelete: (name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tag.id });

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
      <td className="px-4 py-3 font-medium text-gray-800">{tag.name}</td>
      <td className="px-4 py-3 text-gray-500">{tag.tourCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/tags/${tag.id}`}
            className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            編輯
          </Link>
          <DeleteTagButton
            tagId={tag.id}
            tagName={tag.name}
            tourCount={tag.tourCount}
            onDelete={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

export default function SortableTagList({ tags: initial }: { tags: Tag[] }) {
  const [tags, setTags] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const msg = sessionStorage.getItem("adminSaveMsg");
    if (msg) {
      sessionStorage.removeItem("adminSaveMsg");
      setSaveMsg(msg);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, []);

  function handleTagDeleted(id: string, name: string) {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setSuccessMsg(`已刪除標籤「${name}」`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tags.findIndex((t) => t.id === active.id);
    const newIndex = tags.findIndex((t) => t.id === over.id);
    const prev = tags;
    const next = arrayMove(tags, oldIndex, newIndex);
    setTags(next);
    setError(null);

    try {
      const res = await fetch("/api/admin/tags/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((t, i) => ({ id: t.id, sortOrder: i })),
        }),
      });
      if (!res.ok) throw new Error();
      setSuccessMsg("排序已更新");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setTags(prev);
      setError("排序儲存失敗，已還原");
    }
  }

  return (
    <div>
      {/* 手機卡片（靜態，不含拖曳） */}
      <div className="space-y-2 md:hidden">
        {tags.length === 0 && (
          <p className="px-4 py-8 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
            尚無標籤
          </p>
        )}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">{tag.name}</p>
              <p className="mt-0.5 text-xs text-gray-400">使用 {tag.tourCount} 次</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/tags/${tag.id}`}
                className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                編輯
              </Link>
              <DeleteTagButton
                tagId={tag.id}
                tagName={tag.name}
                tourCount={tag.tourCount}
                onDelete={(name) => handleTagDeleted(tag.id, name)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 桌機表格（含拖曳排序） */}
      <DndContext
        id="tags-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden overflow-hidden bg-white border border-gray-200 md:block rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">標籤名稱</th>
                <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap w-28">使用次數</th>
                <th className="w-40 px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <SortableContext
              items={tags.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {tags.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-sm text-center text-gray-400">
                      尚無標籤
                    </td>
                  </tr>
                )}
                {tags.map((tag) => (
                  <SortableRow
                    key={tag.id}
                    tag={tag}
                    onDelete={(name) => handleTagDeleted(tag.id, name)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </DndContext>

      <FloatingToast errorMsg={error} saveMsg={saveMsg} successMsg={successMsg} />
    </div>
  );
}
