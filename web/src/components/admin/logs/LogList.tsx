"use client";

import { useCallback, useEffect, useState } from "react";
import type { LogAction, LogResource } from "@/generated/prisma/client";

type LogEntry = {
  id: string;
  userId: string | null;
  userAccount: string;
  action: LogAction;
  resource: LogResource;
  resourceId: string;
  resourceName: string;
  detail: unknown;
  createdAt: string;
};

type ApiResponse = {
  data: {
    logs: LogEntry[];
    total: number;
    page: number;
    totalPages: number;
  };
};

type User = { id: string; username: string };

const ACTION_LABELS: Record<LogAction, string> = {
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "刪除",
  REORDER: "排序",
  LOGIN: "登入",
  LOGOUT: "登出",
};

const ACTION_COLORS: Record<LogAction, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  REORDER: "bg-gray-100 text-gray-700",
  LOGIN: "bg-yellow-100 text-yellow-800",
  LOGOUT: "bg-yellow-100 text-yellow-700",
};

const RESOURCE_LABELS: Record<LogResource, string> = {
  REGION: "主分類",
  SUB_REGION: "次分類",
  TAG: "標籤",
  TOUR: "行程",
  TOUR_FILE: "行程附件",
  AUTH: "系統登入",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function DetailCell({ detail }: { detail: unknown }) {
  const [open, setOpen] = useState(false);
  if (!detail) return <span className="text-gray-400">—</span>;
  const preview = JSON.stringify(detail);
  const short = preview.length > 60 ? preview.slice(0, 60) + "…" : preview;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-left text-xs text-blue-600 hover:underline"
      >
        {open ? "收合" : short}
      </button>
      {open && (
        <pre className="mt-1 p-2 text-xs bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap break-all max-w-xs">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function LogList({ users }: { users: User[] }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterResource, setFilterResource] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchLogs = useCallback(
    async (p: number) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (filterResource) params.set("resource", filterResource);
      if (filterAction) params.set("action", filterAction);
      if (filterUserId) params.set("userId", filterUserId);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);

      try {
        const res = await fetch(`/api/admin/logs?${params}`);
        const json: ApiResponse = await res.json();
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setPage(json.data.page);
        setTotalPages(json.data.totalPages);
      } finally {
        setLoading(false);
      }
    },
    [filterResource, filterAction, filterUserId, filterDateFrom, filterDateTo]
  );

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  }

  function handleReset() {
    setFilterResource("");
    setFilterAction("");
    setFilterUserId("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <form
        onSubmit={handleFilter}
        className="p-4 bg-white border border-gray-200 rounded-lg space-y-3"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">資源類型</label>
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#D12351" } as React.CSSProperties}
            >
              <option value="">全部</option>
              {(Object.keys(RESOURCE_LABELS) as LogResource[]).map((r) => (
                <option key={r} value={r}>{RESOURCE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">動作</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2"
            >
              <option value="">全部</option>
              {(Object.keys(ACTION_LABELS) as LogAction[]).map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">操作者</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2"
            >
              <option value="">全部</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">開始日期</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">結束日期</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-1.5 text-sm font-medium text-white rounded-md hover:opacity-85 transition-opacity"
            style={{ backgroundColor: "#D12351" }}
          >
            套用篩選
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            重設
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">共 {total} 筆記錄</span>
          {loading && <span className="text-xs text-gray-400">載入中…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap">時間</th>
                <th className="px-4 py-3 whitespace-nowrap">操作者</th>
                <th className="px-4 py-3 whitespace-nowrap">動作</th>
                <th className="px-4 py-3 whitespace-nowrap">資源類型</th>
                <th className="px-4 py-3">資源名稱</th>
                <th className="px-4 py-3">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    無符合條件的記錄
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {log.userAccount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                      {ACTION_LABELS[log.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {RESOURCE_LABELS[log.resource]}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-800 max-w-[200px] truncate" title={log.resourceName}>
                    {log.resourceName}
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <DetailCell detail={log.detail} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              第 {page} / {totalPages} 頁
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一頁
              </button>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 text-xs font-medium text-white rounded hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: "#D12351" }}
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
