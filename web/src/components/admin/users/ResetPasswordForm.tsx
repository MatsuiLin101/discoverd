"use client";

import { useState, FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

export default function ResetPasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("兩次密碼不一致");
      return;
    }
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setPassword("");
        setConfirm("");
      } else {
        setError(data.error ?? "重設失敗");
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
        <label className={labelClass}>新密碼（至少 8 個字元）<span className="ml-0.5 text-rose-500">*</span></label>
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
        <label className={labelClass}>確認新密碼<span className="ml-0.5 text-rose-500">*</span></label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">密碼已重設</p>}

      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: "#D12351" }}
      >
        {isPending ? "重設中…" : "重設密碼"}
      </button>
    </form>
  );
}
