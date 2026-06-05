"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

export default function UserCreateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (data.data) {
        router.push("/admin/users");
      } else {
        setError(data.error ?? "新增失敗");
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
        <label className={labelClass}>電子郵件<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>密碼（至少 8 個字元）<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#D12351" }}
        >
          {isPending ? "新增中…" : "新增使用者"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}
