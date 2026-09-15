"use client";

import { useEffect, useState } from "react";
import { KEY_OWNER_LABEL, type KeyOwner } from "@/lib/ai/key-owner";

const MAX = 5;

interface Candidate {
  id: string;
  text: string | null;
  model: string | null;
  keyOwner: KeyOwner | null;
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
  const [model, setModel] = useState("");
  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [quota, setQuota] = useState<"personal" | "shared">("personal");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tours/${tourId}/ai/generations?kind=DESCRIPTION`)
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tourId]);

  // Pre-fill the model selector with the user's effective model.
  useEffect(() => {
    fetch("/api/admin/ai/effective")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.descriptionModel) setModel(data.descriptionModel);
        if (data?.hasPersonalGeminiKey) setHasPersonalKey(true);
      })
      .catch(() => {});
  }, []);

  const atLimit = candidates.length >= MAX;

  async function generate(promptOverride?: string) {
    if (atLimit || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/ai/description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: hint.trim() || undefined, context: getContext?.(), promptOverride, model: model.trim() || undefined, quota: hasPersonalKey ? quota : undefined }),
      });
      const { data, error } = await res.json();
      if (res.ok && data) {
        setCandidates((prev) => [data, ...prev]);
        setPreviewOpen(false);
      } else {
        setError(error ?? "生成失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setGenerating(false);
    }
  }

  async function openPreview() {
    if (atLimit || previewLoading) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/ai/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "DESCRIPTION", hint: hint.trim() || undefined, context: getContext?.() }),
      });
      const { data, error } = await res.json();
      if (res.ok && data) {
        setPreviewPrompt(data.prompt);
        setPreviewOpen(true);
      } else {
        setError(error ?? "預覽失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/tours/${tourId}/ai/generations/${id}`, { method: "DELETE" });
    if (res.ok) setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <label className="whitespace-nowrap text-xs text-gray-500">Gemini 模型</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="例如：gemini-3.6-flash"
          className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#D12351]"
        />
        <span className="text-xs text-gray-400">本次生成使用；預設為你的偏好/系統值</span>
      </div>
      {hasPersonalKey && (
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-xs text-gray-500">額度來源</label>
            <select
              value={quota}
              onChange={(e) => setQuota(e.target.value as "personal" | "shared")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#D12351]"
            >
              <option value="personal">個人額度（用完自動改用公用）</option>
              <option value="shared">公用額度</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            「個人額度」優先用你自己的金鑰，用完會自動改用公用、不中斷；「公用額度」只用公司金鑰、保留你的個人額度。兩者皆用完才會失敗。
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="額外重點提示（選填），例如：主打親子、溫泉"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D12351]"
        />
        <button
          type="button"
          onClick={openPreview}
          disabled={atLimit || previewLoading || generating}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewLoading ? "載入中…" : "預覽提示詞"}
        </button>
        <button
          type="button"
          onClick={() => generate()}
          disabled={atLimit || generating}
          className="cursor-pointer rounded-lg bg-[#D12351] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "生成中…" : "✨ AI 生成簡介"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-gray-400">
        會依行程名稱、地區、標籤與已上傳的 PDF 生成，可多次生成並挑選喜歡的版本（{candidates.length}/{MAX}）。
        {atLimit && <span className="text-rose-500">已達上限，請先刪除舊版本。</span>}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        「額外重點提示」為選填，會附加在提示詞範本之後作為補充，不會取代範本；想調整整段提示詞可用「預覽提示詞」。
      </p>

      {previewOpen && (
        <div className="mt-3 rounded-lg border border-[#D12351]/40 bg-white p-3">
          <p className="mb-1.5 text-xs font-medium text-gray-700">送出前可檢視並修改提示詞：</p>
          <textarea
            rows={8}
            value={previewPrompt}
            onChange={(e) => setPreviewPrompt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#D12351]"
          />
          <p className="mt-1 text-xs text-gray-400">附加的 PDF 內容會自動一併送出（不在此文字中）。</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => generate(previewPrompt)}
              disabled={generating || !previewPrompt.trim()}
              className="cursor-pointer rounded-lg bg-[#D12351] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "生成中…" : "以此提示詞生成"}
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="cursor-pointer text-xs text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      )}

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
                  {c.keyOwner && (
                    <span className={`ml-auto text-xs ${c.keyOwner === "personal" ? "text-emerald-600" : "text-gray-400"}`}>
                      {KEY_OWNER_LABEL[c.keyOwner]}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
