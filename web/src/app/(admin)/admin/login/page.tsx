"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.ok) {
        router.push("/admin");
      } else {
        setError(data.error ?? "登入失敗，請再試一次");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "#fffcfd" }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1
          className="text-center text-2xl font-bold tracking-wide"
          style={{ color: "#D12351" }}
        >
          找到了旅行社
        </h1>
        <p className="mb-8 mt-1 text-center text-sm text-gray-500">
          後台登入
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-transparent focus:ring-2"
              style={
                {
                  "--tw-ring-color": "#D12351",
                } as React.CSSProperties
              }
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #D12351")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              密碼
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition"
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #D12351")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#D12351" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
            onMouseEnter={(e) => {
              if (!isPending)
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            {isPending ? "登入中…" : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
