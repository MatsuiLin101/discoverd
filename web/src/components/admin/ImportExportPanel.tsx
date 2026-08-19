"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewRow {
  row: number;
  action: "create" | "update" | "skip";
  label: string;
  detail?: string;
  duplicate?: boolean;
}
interface RowIssue {
  row: number;
  message: string;
}
interface Preview {
  rows: PreviewRow[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: RowIssue[];
  duplicates: RowIssue[];
}
interface PriorImport {
  filename: string;
  committedAt: string | null;
}

interface Props {
  /** e.g. "標籤" */
  moduleLabel: string;
  /** GET endpoints */
  exportHref: string;
  templateHref: string;
  /** POST endpoints */
  previewUrl: string;
  commitUrl: string;
  /** Short description of the expected columns. */
  columnsHint?: string;
  /** Import is ADMIN-only; STAFF sees export/template only. */
  canImport?: boolean;
}

const ACTION_STYLE: Record<PreviewRow["action"], string> = {
  create: "text-emerald-700 bg-emerald-50",
  update: "text-sky-700 bg-sky-50",
  skip: "text-gray-500 bg-gray-100",
};
const ACTION_LABEL: Record<PreviewRow["action"], string> = {
  create: "新增",
  update: "修改",
  skip: "略過",
};

export default function ImportExportPanel({
  moduleLabel,
  exportHref,
  templateHref,
  previewUrl,
  commitUrl,
  columnsHint,
  canImport = true,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [priorImport, setPriorImport] = useState<PriorImport | null>(null);
  const [result, setResult] = useState<{ createdCount: number; updatedCount: number; skippedCount: number } | null>(null);

  function reset() {
    setToken(null);
    setPreview(null);
    setPriorImport(null);
    setResult(null);
    setError(null);
    setFilename(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setToken(null);
    setFilename(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(previewUrl, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "匯入預覽失敗");
        return;
      }
      setToken(json.data.token);
      setPreview(json.data.preview);
      setPriorImport(json.data.priorImport ?? null);
    } catch {
      setError("上傳失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(commitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "匯入失敗");
        return;
      }
      setResult(json.data);
      setPreview(null);
      setToken(null);
      router.refresh();
    } catch {
      setError("匯入失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  const hasBlocking = !!preview && preview.createdCount + preview.updatedCount === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">{moduleLabel}匯入 / 匯出</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href={exportHref}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            匯出 Excel
          </a>
          <a
            href={templateHref}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            下載範本
          </a>
          {canImport && (
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                if (open) reset();
              }}
              className="rounded-lg bg-[#D12351] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#b51d45]"
            >
              {open ? "收合匯入" : "匯入 Excel"}
            </button>
          )}
        </div>
      </div>

      {canImport && open && (
        <div className="border-t border-gray-200 px-4 py-4">
          {columnsHint && <p className="mb-2 text-xs text-gray-500">欄位：{columnsHint}</p>}

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={handleFile}
            disabled={busy}
            className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          {filename && <p className="mt-2 text-xs text-gray-500">已選檔案：{filename}</p>}

          {busy && <p className="mt-3 text-sm text-gray-500">處理中…</p>}
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          {priorImport && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              ⚠️ 這個檔案先前匯入過（{priorImport.filename}
              {priorImport.committedAt ? `，${new Date(priorImport.committedAt).toLocaleString("zh-TW")}` : ""}）。確認是否仍要匯入。
            </p>
          )}

          {preview && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-700">新增 {preview.createdCount}</span>
                <span className="text-sky-700">修改 {preview.updatedCount}</span>
                <span className="text-gray-500">略過 {preview.skippedCount}</span>
                {preview.duplicates.length > 0 && (
                  <span className="text-amber-700">疑似重複 {preview.duplicates.length}</span>
                )}
                {preview.errors.length > 0 && (
                  <span className="text-rose-600">錯誤 {preview.errors.length}</span>
                )}
              </div>

              {preview.errors.length > 0 && (
                <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <p className="font-medium">錯誤列（不會匯入）：</p>
                  <ul className="mt-1 list-inside list-disc">
                    {preview.errors.slice(0, 50).map((e) => (
                      <li key={e.row}>第 {e.row} 列：{e.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.duplicates.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <p className="font-medium">⚠️ 疑似重複（仍可匯入，將視為新資料）：</p>
                  <ul className="mt-1 list-inside list-disc">
                    {preview.duplicates.slice(0, 50).map((d) => (
                      <li key={d.row}>第 {d.row} 列：{d.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2">列</th>
                      <th className="px-3 py-2">動作</th>
                      <th className="px-3 py-2">內容</th>
                      <th className="px-3 py-2">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 300).map((r) => (
                      <tr key={r.row} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                        <td className="px-3 py-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-xs ${ACTION_STYLE[r.action]}`}>
                            {ACTION_LABEL[r.action]}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {r.label}
                          {r.duplicate && <span className="ml-1 text-amber-600">⚠️</span>}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{r.detail ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 300 && (
                  <p className="px-3 py-2 text-xs text-gray-400">僅顯示前 300 列，其餘照規則處理。</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={busy || hasBlocking}
                  className="rounded-lg bg-[#D12351] px-4 py-2 text-sm font-medium text-white hover:bg-[#b51d45] disabled:opacity-50"
                >
                  確定匯入
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                {hasBlocking && (
                  <span className="text-xs text-gray-400">沒有可新增或修改的資料。</span>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              匯入完成 — 新增 {result.createdCount}、修改 {result.updatedCount}、略過 {result.skippedCount}。
              <button
                type="button"
                onClick={reset}
                className="ml-3 rounded border border-emerald-300 px-2 py-1 text-xs font-medium hover:bg-emerald-100"
              >
                完成
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
