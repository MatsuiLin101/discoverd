"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AiContext } from "./AiDescriptionCandidates";
import { KEY_OWNER_LABEL, type KeyOwner } from "@/lib/ai/key-owner";

const MAX = 5;
const POLL_INTERVAL = 4000;

interface Candidate {
  id: string;
  status: "PENDING" | "READY" | "FAILED";
  imageKey: string | null;
  imageUrl: string | null;
  error: string | null;
  keyOwner: KeyOwner | null;
  isSelected: boolean;
  createdAt: string;
}

export default function AiThumbnailCandidates({
  tourId,
  onSelect,
  getContext,
  selectedKey,
}: {
  tourId: string;
  onSelect: (choice: { key: string; url: string }) => void;
  getContext?: () => AiContext;
  /** Live-adopted candidate image key (parent form state) — highlights the chosen
   * card immediately, before the form is saved. Null means fall back to the saved one. */
  selectedKey?: string | null;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hint, setHint] = useState("");
  const [agentProfile, setAgentProfile] = useState("standard");
  const [includePdfs, setIncludePdfs] = useState(true);
  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [quota, setQuota] = useState<"personal" | "shared">("personal");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Candidates that still count toward the cap (pending + ready).
  const activeCount = candidates.filter((c) => c.status !== "FAILED").length;
  const atLimit = activeCount >= MAX;

  const pollPending = useCallback(async () => {
    const pending = candidates.filter((c) => c.status === "PENDING");
    if (pending.length === 0) return;
    const updates = await Promise.all(
      pending.map((c) =>
        fetch(`/api/admin/tours/${tourId}/ai/generations/${c.id}`)
          .then((r) => r.json())
          .then(({ data }) => data as Candidate)
          .catch(() => null),
      ),
    );
    setCandidates((prev) =>
      prev.map((c) => updates.find((u) => u && u.id === c.id) ?? c),
    );
  }, [candidates, tourId]);

  useEffect(() => {
    fetch(`/api/admin/tours/${tourId}/ai/generations?kind=THUMBNAIL`)
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tourId]);

  // Pre-fill the profile selector with the user's effective profile.
  useEffect(() => {
    fetch("/api/admin/ai/effective")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.thumbnailAgentProfile) setAgentProfile(data.thumbnailAgentProfile);
        if (data?.hasPersonalManusKey) setHasPersonalKey(true);
      })
      .catch(() => {});
  }, []);

  // Poll while any candidate is pending.
  useEffect(() => {
    const hasPending = candidates.some((c) => c.status === "PENDING");
    if (!hasPending) return;
    pollRef.current = setTimeout(pollPending, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [candidates, pollPending]);

  async function generate(promptOverride?: string) {
    if (atLimit || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/ai/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: hint.trim() || undefined, context: getContext?.(), promptOverride, agentProfile, quota: hasPersonalKey ? quota : undefined, includePdfs }),
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
        body: JSON.stringify({ kind: "THUMBNAIL", hint: hint.trim() || undefined, context: getContext?.(), includePdfs }),
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
    if (!confirm("確定刪除此縮圖？刪除後無法復原。")) return;
    const res = await fetch(`/api/admin/tours/${tourId}/ai/generations/${id}`, { method: "DELETE" });
    if (res.ok) setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <label className="whitespace-nowrap text-xs text-gray-500">Manus 品質</label>
        <select
          value={agentProfile}
          onChange={(e) => setAgentProfile(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#D12351]"
        >
          <option value="lite">lite（省 credit）</option>
          <option value="standard">standard</option>
          <option value="max">max（高品質）</option>
        </select>
        <span className="text-xs text-gray-400">本次生成使用；預設為你的偏好/系統值</span>
      </div>
      <div className="mb-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={includePdfs}
            onChange={(e) => setIncludePdfs(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-[#D12351]"
          />
          一併送出已上傳的 PDF 作為參考
        </label>
        <p className="mt-1 text-xs text-gray-400">取消勾選則只依行程名稱、地區、標籤等文字資訊生成，不讀取 PDF。</p>
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
              <option value="personal">個人額度（餘額不足自動改用公用）</option>
              <option value="shared">公用額度</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            「個人額度」優先用你自己的金鑰，餘額不足會自動改用公用、不中斷；「公用額度」只用公司金鑰、保留你的個人額度。兩者皆用完才會失敗。
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="額外重點提示（選填），例如：櫻花、夜景"
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
          {generating ? "送出中…" : "✨ AI 生成縮圖"}
        </button>
      </div>

      <p className="mt-1.5 text-xs text-gray-400">
        「額外重點提示」為選填，會附加在縮圖提示詞範本之後作為補充，不會取代範本；想調整整段提示詞可用「預覽提示詞」。
      </p>
      <p className="mt-1 text-xs text-gray-400">
        由 Manus 產生，需稍候（可離開後再回來查看），可多次生成並挑選喜歡的版本（{activeCount}/{MAX}）。
        {atLimit && <span className="text-rose-500">已達上限，請先刪除舊版本。</span>}
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
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => generate(previewPrompt)}
              disabled={generating || !previewPrompt.trim()}
              className="cursor-pointer rounded-lg bg-[#D12351] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "送出中…" : "以此提示詞生成"}
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
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {candidates.map((c) => {
              const applied = c.isSelected; // saved in DB (live on the site)
              const picked = selectedKey != null && !!c.imageKey && c.imageKey === selectedKey; // live pick
              const pendingPick = picked && !applied; // picked but not yet saved
              // The candidate that will take effect on save (live pick, else the saved one).
              const effective = selectedKey != null ? picked : applied;
              return (
              <li key={c.id} className={`overflow-hidden rounded-lg border bg-white ${
                pendingPick
                  ? "border-amber-400 ring-2 ring-amber-300/50"
                  : applied
                    ? "border-[#D12351] ring-2 ring-[#D12351]/30"
                    : "border-gray-200"
              }`}>
                <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-100">
                  {applied && (
                    <span className="absolute left-1 top-1 z-10 rounded bg-[#D12351] px-1.5 py-0.5 text-[10px] font-medium text-white">✓ 目前套用</span>
                  )}
                  {pendingPick && (
                    <span className="absolute left-1 top-1 z-10 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">● 目前選擇・未存</span>
                  )}
                  {c.status === "READY" && c.imageUrl ? (
                    <Image src={c.imageUrl} alt="AI 縮圖候選" fill className="object-cover" unoptimized />
                  ) : c.status === "PENDING" ? (
                    <span className="text-xs text-gray-400">產生中…</span>
                  ) : (
                    <span className="px-2 text-center text-xs text-rose-500">{c.error ?? "生成失敗"}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    disabled={c.status !== "READY" || !c.imageUrl || effective}
                    onClick={() => c.imageUrl && onSelect({ key: c.imageKey as string, url: c.imageUrl })}
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${effective ? "cursor-default border-[#D12351] bg-[#D12351] text-white" : "cursor-pointer border-[#D12351] text-[#D12351] hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"}`}
                  >
                    {effective ? "使用中" : "選用"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="cursor-pointer text-xs text-gray-400 hover:text-rose-600"
                  >
                    刪除
                  </button>
                </div>
                {c.keyOwner && (
                  <p
                    className={`px-2 pb-1.5 text-[10px] leading-tight ${c.keyOwner === "personal" ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {KEY_OWNER_LABEL[c.keyOwner]}
                  </p>
                )}
              </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
