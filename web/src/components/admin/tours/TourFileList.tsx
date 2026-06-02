"use client";

import { useRef, useState } from "react";
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

interface TourFile {
  id: string;
  url: string;
  mimeType: string;
  filename?: string | null;
  sortOrder: number;
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

function PdfIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="4" fill="#fee2e2" />
      <text x="6" y="22" fontSize="11" fontWeight="bold" fill="#dc2626" fontFamily="monospace">
        PDF
      </text>
    </svg>
  );
}

function SortableFileRow({
  file,
  tourId,
  onDelete,
}: {
  file: TourFile;
  tourId: string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  });
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isImage = file.mimeType.startsWith("image/");

  async function handleDelete() {
    if (!confirm("確定刪除此檔案？")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/tours/${tourId}/files/${file.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onDelete(file.id);
    } else {
      const data = await res.json();
      setError(data.error ?? "刪除失敗");
      setDeleting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 ${
        isDragging ? "shadow-md opacity-80" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        aria-label="拖曳排序"
      >
        <GripIcon />
      </button>

      <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-50">
        {isImage ? (
          <Image
            src={file.url}
            alt="預覽"
            width={56}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <PdfIcon />
        )}
      </div>

      <span className="flex-1 truncate text-sm text-gray-600">
        {file.filename ?? (isImage ? "圖片" : "PDF 檔案")}
      </span>

      <div className="flex items-center gap-2">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          預覽
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="cursor-pointer text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
        >
          {deleting ? "刪除中…" : "刪除"}
        </button>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  );
}

export default function TourFileList({
  tourId,
  initialFiles,
}: {
  tourId: string;
  initialFiles: TourFile[];
}) {
  const [files, setFiles] = useState(
    [...initialFiles].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = files.findIndex((f) => f.id === active.id);
    const newIndex = files.findIndex((f) => f.id === over.id);
    const prev = files;
    const next = arrayMove(files, oldIndex, newIndex);
    setFiles(next);
    setReorderError(null);

    try {
      const res = await fetch(`/api/admin/tours/${tourId}/files/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.map((f, i) => ({ id: f.id, sortOrder: i })) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFiles(prev);
      setReorderError("排序儲存失敗，已還原");
    }
  }

  function handleDelete(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    selected.forEach((f) => fd.append("files", f));

    try {
      const res = await fetch(`/api/admin/tours/${tourId}/files`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setFiles((prev) => [...prev, ...data.data]);
      } else {
        setUploadError(data.error ?? "上傳失敗");
      }
    } catch {
      setUploadError("網路錯誤，請稍後再試");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {reorderError && (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{reorderError}</p>
      )}

      <DndContext
        id="tour-files-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {files.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                尚未上傳任何檔案
              </p>
            )}
            {files.map((file) => (
              <SortableFileRow
                key={file.id}
                file={file}
                tourId={tourId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="space-y-1.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          disabled={uploading}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200 disabled:opacity-50"
        />
        {uploading && <p className="text-xs text-gray-500">上傳中…</p>}
        {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
      </div>
    </div>
  );
}
