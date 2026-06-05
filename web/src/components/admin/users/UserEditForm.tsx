"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

export default function UserEditForm({
  userId,
  initialUsername,
  initialDisplayName,
  initialEmail,
  initialRole,
}: {
  userId: string;
  initialUsername: string;
  initialDisplayName: string | null;
  initialEmail: string | null;
  initialRole: "ADMIN" | "STAFF";
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [role, setRole] = useState<"ADMIN" | "STAFF">(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: displayName || undefined,
          email: email || undefined,
          role,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(data.error ?? "更新失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div>
        <label className={labelClass}>帳號<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>顯示名稱</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>電子郵件</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>角色</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
          className={inputClass}
        >
          <option value="STAFF">一般帳號</option>
          <option value="ADMIN">管理員</option>
        </select>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">已儲存</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#D12351" }}
        >
          {isPending ? "儲存中…" : "儲存變更"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          返回列表
        </button>
      </div>
    </form>
  );
}
