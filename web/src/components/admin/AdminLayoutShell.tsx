"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import type { UserRole } from "@/types";

export default function AdminLayoutShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#fffcfd" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="開啟選單"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="3.75" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="1" y="12.75" width="16" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </button>
          <span className="text-sm font-bold" style={{ color: "#D12351" }}>
            找到了旅行社
          </span>
          <span className="text-xs text-gray-400">後台管理</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
