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
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { uploadFile } from "@/lib/upload-client";

interface SalesAgent {
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
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="4" fill="#fee2e2" />
      <text x="6" y="22" fontSize="11" fontWeight="bold" fill="#dc2626" fontFamily="monospace">
        PDF
      </text>
    </svg>
  );
}

function SortableCard({
  agent,
  regionId,
  onDelete,
}: {
  agent: SalesAgent;
  regionId: string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agent.id,
  });
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isImage = agent.mimeType.startsWith("image/");

  async function handleDelete() {
    if (!confirm("確定刪除此業務名片？")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/sales/regions/${regionId}/agents/${agent.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onDelete(agent.id);
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
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${
        isDragging ? "shadow-md opacity-80" : ""
      }`}
    >
      <div className="relative flex aspect-[16/10] items-center justify-center bg-gray-50">
        {isImage ? (
          <Image src={agent.url} alt={agent.filename ?? "業務名片"} fill className="object-contain" unoptimized />
        ) : (
          <PdfIcon />
        )}
        <button
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 rounded-md bg-white/85 p-1 text-gray-400 cursor-grab touch-none hover:text-gray-600 active:cursor-grabbing"
          aria-label="拖曳排序"
        >
          <GripIcon />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex-1 truncate text-xs text-gray-500">
          {agent.filename ?? (isImage ? "圖片名片" : "PDF 名片")}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={agent.url}
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
        </div>
      </div>
      {error && <p className="px-3 pb-2 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

export default function SalesAgentManager({
  regionId,
  initialAgents,
}: {
  regionId: string;
  initialAgents: SalesAgent[];
}) {
  const [agents, setAgents] = useState(
    [...initialAgents].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = agents.findIndex((a) => a.id === active.id);
    const newIndex = agents.findIndex((a) => a.id === over.id);
    const prev = agents;
    const next = arrayMove(agents, oldIndex, newIndex);
    setAgents(next);
    setReorderError(null);

    try {
      const res = await fetch(`/api/admin/sales/regions/${regionId}/agents/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.map((a, i) => ({ id: a.id, sortOrder: i })) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAgents(prev);
      setReorderError("排序儲存失敗，已還原");
    }
  }

  function handleDelete(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploaded = await Promise.all(selected.map((f) => uploadFile(f, "sales-cards")));
      const res = await fetch(`/api/admin/sales/regions/${regionId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: uploaded }),
      });
      const text = await res.text();
      let data: { data?: SalesAgent[]; error?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        setUploadError(`儲存失敗（伺服器回應非預期格式，狀態碼 ${res.status}，請重新整理或重啟開發伺服器後再試）`);
        return;
      }
      if (res.ok && data.data) {
        setAgents((prev) => [...prev, ...data.data!]);
      } else {
        setUploadError(data.error ?? "上傳失敗");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "網路錯誤，請稍後再試");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 rounded-xl border border-gray-200 bg-white p-4">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">上傳業務名片</label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          disabled={uploading}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200 disabled:opacity-50"
        />
        <p className="text-xs text-gray-400">支援圖片或 PDF，可一次選擇多個檔案</p>
        {uploading && <p className="text-xs text-gray-500">上傳中…</p>}
        {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
      </div>

      {reorderError && (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{reorderError}</p>
      )}

      <DndContext
        id="sales-agents-sortable"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={agents.map((a) => a.id)} strategy={rectSortingStrategy}>
          {agents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
              尚未上傳任何業務名片
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <SortableCard
                  key={agent.id}
                  agent={agent}
                  regionId={regionId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
}
