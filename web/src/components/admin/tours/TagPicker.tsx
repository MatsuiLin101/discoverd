"use client";

import { useMemo, useState, KeyboardEvent } from "react";
import { compareTagName } from "@/lib/tag-sort";

export interface TagOption {
  id: string;
  name: string;
}

interface Props {
  tags: TagOption[];
  setTags: React.Dispatch<React.SetStateAction<TagOption[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";

export default function TagPicker({ tags, setTags, selectedIds, setSelectedIds }: Props) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  // Options sorted by text collation (matches the frontend search page).
  const sorted = useMemo(() => [...tags].sort((a, b) => compareTagName(a.name, b.name)), [tags]);

  // Selected chips always show; the rest are filtered by the search text.
  const visible = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return sorted;
    return sorted.filter((t) => selectedIds.includes(t.id) || t.name.toLowerCase().includes(q));
  }, [sorted, trimmed, selectedIds]);

  const exactMatch = useMemo(
    () => tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase()) ?? null,
    [tags, trimmed]
  );
  const showCreate = trimmed !== "" && !exactMatch;

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function selectId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function createTag() {
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const tag: TagOption = { id: data.data.id, name: data.data.name };
        setTags((prev) => [...prev, tag]);
        selectId(tag.id);
        setQuery("");
      } else if (res.status === 409) {
        // Already exists (possibly created elsewhere): just select it if we have it.
        const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
          selectId(existing.id);
          setQuery("");
        } else {
          setError("此標籤名稱已存在，請重新整理後再試");
        }
      } else {
        setError(data.error ?? "新增標籤失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    // Enter here must not submit the surrounding tour form.
    e.preventDefault();
    if (!trimmed) return;
    if (exactMatch) {
      selectId(exactMatch.id);
      setQuery("");
    } else {
      void createTag();
    }
  }

  return (
    <div>
      <label className={labelClass}>標籤（可多選）</label>
      <div className="space-y-2 rounded-lg border border-gray-300 bg-gray-50 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className={inputClass}
            placeholder="搜尋標籤，或輸入後新增"
          />
          {showCreate && (
            <button
              type="button"
              onClick={() => void createTag()}
              disabled={creating}
              className="flex-shrink-0 cursor-pointer whitespace-nowrap rounded-lg border border-[#D12351] bg-white px-3 py-2 text-sm font-medium text-[#D12351] transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "新增中…" : `＋ 新增標籤「${trimmed}」`}
            </button>
          )}
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        {visible.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visible.map((tag) => {
              const checked = selectedIds.includes(tag.id);
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
                    onChange={() => toggle(tag.id)}
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {tags.length === 0 ? "尚無標籤，可於上方輸入後新增。" : "沒有符合的標籤。"}
          </p>
        )}
      </div>
    </div>
  );
}
