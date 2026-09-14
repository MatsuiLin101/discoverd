"use client";

import { useEffect, useState } from "react";

const MAX = 5;

interface Candidate {
  id: string;
  text: string | null;
  model: string | null;
  createdAt: string;
}

export interface AiContext {
  name?: string;
  price?: number;
  regionName?: string;
  subRegionName?: string;
  tagNames?: string[];
}

export default function AiDescriptionCandidates({
  tourId,
  onSelect,
  getContext,
}: {
  tourId: string;
  onSelect: (text: string) => void;
  getContext?: () => AiContext;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/tours/${tourId}/ai/generations?kind=DESCRIPTION`)
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tourId]);

  const atLimit = candidates.length >= MAX;

  async function generate() {
    if (atLimit || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/ai/description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: hint.trim() || undefined, context: getContext?.() }),
      });
      const { data, error } = await res.json();
      if (res.ok && data) {
        setCandidates((prev) => [data, ...prev]);
      } else {
        setError(error ?? "生成失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/tours/${tourId}/ai/generations/${id}`, { method: "DELETE" });
    if (res.ok) setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="重點提示（選填），例如：主打親子、溫泉"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D12351]"
        />
        <button
          type="button"
          onClick={generate}
          disabled={atLimit || generating}
          className="cursor-pointer rounded-lg bg-[#D12351] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "生成中…" : "✨ AI 生成簡介"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-gray-400">
        會參考行程名稱、地區、標籤與已上傳的 PDF 內容生成，可多次生成挑選（{candidates.length}/{MAX}）。
        {atLimit && <span className="text-rose-500">　已達上限，請先刪除舊版本。</span>}
      </p>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-2 text-xs text-gray-400">載入候選中…</p>
      ) : (
        candidates.length > 0 && (
          <ul className="mt-3 space-y-2">
            {candidates.map((c) => (
              <li key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="whitespace-pre-wrap text-sm text-gray-700">{c.text}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(c.text ?? "")}
                    className="cursor-pointer rounded-md border border-[#D12351] px-2.5 py-1 text-xs font-medium text-[#D12351] transition-colors hover:bg-rose-50"
                  >
                    選用此版本
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="cursor-pointer text-xs text-gray-400 hover:text-rose-600"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
