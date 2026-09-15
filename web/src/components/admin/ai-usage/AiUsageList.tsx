"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface Row {
  id: string;
  createdAt: string;
  userAccount: string;
  tourId: string | null;
  tourName: string;
  kind: "DESCRIPTION" | "THUMBNAIL";
  provider: string;
  model: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  hint: string | null;
  promptOverridden: boolean;
  promptText: string | null;
  pdfCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  thoughtsTokens: number | null;
  totalTokens: number | null;
  taskId: string | null;
  agentProfile: string | null;
  keyOwner: string | null;
  latencyMs: number | null;
  resultRef: string | null;
  outputChars: number | null;
  error: string | null;
}

interface Summary {
  count: number;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
  success: number;
  failed: number;
  pending: number;
  personalCount: number;
  estimatedCost: number | null;
}

const KEY_OWNER_SHORT: Record<string, string> = {
  personal: "個人",
  shared: "公用",
  fallback_quota: "公用(退回)",
  fallback_error: "公用(退回)",
};

interface UserOpt {
  userId: string | null;
  userAccount: string;
  count: number;
}

const KIND_LABEL = { DESCRIPTION: "簡介", THUMBNAIL: "縮圖" } as const;
const STATUS_STYLE: Record<Row["status"], string> = {
  SUCCESS: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  PENDING: "bg-yellow-100 text-yellow-800",
};
const STATUS_LABEL: Record<Row["status"], string> = { SUCCESS: "成功", FAILED: "失敗", PENDING: "處理中" };

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D12351]";

export default function AiUsageList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (kind) qs.set("kind", kind);
    if (status) qs.set("status", status);
    if (userId) qs.set("userId", userId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    qs.set("page", String(page));
    fetch(`/api/admin/ai-usage?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.data ?? []);
        setSummary(d.summary ?? null);
        setUsers(d.users ?? []);
        setIsAdmin(!!d.isAdmin);
        setTotal(d.total ?? 0);
        setPageSize(d.pageSize ?? 50);
      })
      .finally(() => setLoading(false));
  }, [kind, status, userId, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing a filter resets to page 1 (done in the handlers, not an effect).
  function onFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setter(e.target.value);
      setPage(1);
      setLoading(true);
    };
  }

  function goPage(p: number) {
    setPage(p);
    setLoading(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">AI 使用紀錄</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? "全站 AI 生成的使用與成本紀錄。" : "你自己的 AI 生成使用紀錄。"}
        </p>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-400">總次數</p>
            <p className="mt-0.5 text-lg font-bold text-gray-800">{summary.count}</p>
            <p className="text-xs text-gray-400">成功 {summary.success}・失敗 {summary.failed}・處理中 {summary.pending}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-400">Gemini 總 tokens</p>
            <p className="mt-0.5 text-lg font-bold text-gray-800">{summary.totalTokens.toLocaleString()}</p>
            <p className="text-xs text-gray-400">輸入 {summary.inputTokens.toLocaleString()}・輸出+思考 {(summary.outputTokens + summary.thoughtsTokens).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-400">估算成本</p>
            <p className="mt-0.5 text-lg font-bold text-gray-800">
              {summary.estimatedCost != null ? `NT$ ${summary.estimatedCost.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-400">
              {summary.estimatedCost == null ? "未設定單價" : "依 AI 設定單價"}
              {summary.personalCount > 0 ? `・不含個人額度 ${summary.personalCount} 筆` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-400">篩選結果</p>
            <p className="mt-0.5 text-lg font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-400">第 {page} / {totalPages} 頁</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={kind} onChange={onFilter(setKind)} className={selectClass}>
          <option value="">全部類型</option>
          <option value="DESCRIPTION">簡介</option>
          <option value="THUMBNAIL">縮圖</option>
        </select>
        <select value={status} onChange={onFilter(setStatus)} className={selectClass}>
          <option value="">全部狀態</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失敗</option>
          <option value="PENDING">處理中</option>
        </select>
        {isAdmin && (
          <select value={userId} onChange={onFilter(setUserId)} className={selectClass}>
            <option value="">全部使用者</option>
            {users.map((u) => (
              <option key={u.userId ?? "none"} value={u.userId ?? ""}>
                {u.userAccount}（{u.count}）
              </option>
            ))}
          </select>
        )}
        <input type="date" value={from} onChange={onFilter(setFrom)} className={selectClass} />
        <span className="text-sm text-gray-400">～</span>
        <input type="date" value={to} onChange={onFilter(setTo)} className={selectClass} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">尚無使用紀錄</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">時間</th>
                {isAdmin && <th className="px-3 py-2 font-medium">使用者</th>}
                <th className="px-3 py-2 font-medium">行程</th>
                <th className="px-3 py-2 font-medium">類型</th>
                <th className="px-3 py-2 font-medium">模型</th>
                <th className="px-3 py-2 font-medium">狀態</th>
                <th className="px-3 py-2 font-medium">額度</th>
                <th className="px-3 py-2 font-medium">用量</th>
                <th className="px-3 py-2 font-medium">耗時</th>
                <th className="px-3 py-2 font-medium">詳情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="text-gray-700">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{fmtDate(r.createdAt)}</td>
                    {isAdmin && <td className="px-3 py-2">{r.userAccount}</td>}
                    <td className="max-w-[12rem] truncate px-3 py-2" title={r.tourName}>{r.tourName}</td>
                    <td className="px-3 py-2">{KIND_LABEL[r.kind]}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.model ?? r.provider}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.keyOwner ? (
                        <span className={r.keyOwner === "personal" ? "text-emerald-600" : "text-gray-500"}>
                          {KEY_OWNER_SHORT[r.keyOwner] ?? r.keyOwner}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                      {r.kind === "DESCRIPTION"
                        ? r.totalTokens != null
                          ? `${r.totalTokens.toLocaleString()} tok`
                          : "—"
                        : r.provider === "manus"
                          ? "縮圖"
                          : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                      {r.latencyMs != null ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="cursor-pointer text-xs text-[#D12351] hover:underline"
                      >
                        {expanded === r.id ? "收合" : "展開"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={isAdmin ? 10 : 9} className="px-3 py-3">
                        <div className="space-y-1.5 text-xs text-gray-600">
                          {r.error && <p className="text-rose-600">錯誤：{r.error}</p>}
                          <p>提供者 / 模型：{r.provider}{r.model ? ` / ${r.model}` : ""}{r.agentProfile ? `（${r.agentProfile}）` : ""}</p>
                          {r.kind === "DESCRIPTION" && (
                            <p>
                              tokens — 輸入 {r.inputTokens ?? "—"}、輸出 {r.outputTokens ?? "—"}、思考 {r.thoughtsTokens ?? "—"}、合計 {r.totalTokens ?? "—"}；輸出字數 {r.outputChars ?? "—"}
                            </p>
                          )}
                          <p>PDF 份數：{r.pdfCount}・提示詞{r.promptOverridden ? "（已手動編輯）" : ""}{r.hint ? `・重點提示：${r.hint}` : ""}</p>
                          {r.taskId && <p>Manus taskId：{r.taskId}</p>}
                          {r.promptText && (
                            <details>
                              <summary className="cursor-pointer text-[#D12351]">查看送出的提示詞</summary>
                              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-2">{r.promptText}</pre>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goPage(Math.max(1, page - 1))}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一頁
          </button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goPage(Math.min(totalPages, page + 1))}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
