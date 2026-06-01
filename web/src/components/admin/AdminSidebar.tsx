"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
}

interface NavGroup {
  title?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ label: "後台首頁", href: "/admin" }],
  },
  {
    title: "前台管理",
    items: [
      { label: "地區管理", href: "/admin/regions" },
      { label: "旅遊方案", href: "/admin/tours" },
      { label: "標籤管理", href: "/admin/tags" },
      { label: "客戶諮詢", href: "/admin/inquiries" },
    ],
  },
  {
    title: "系統管理",
    adminOnly: true,
    items: [{ label: "使用者管理", href: "/admin/users" }],
  },
];

export default function AdminSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-100 bg-white">
      <div className="px-5 py-6">
        <span
          className="text-base font-bold leading-tight"
          style={{ color: "#D12351" }}
        >
          找到了旅行社
        </span>
        <p className="mt-0.5 text-xs text-gray-400">後台管理</p>
      </div>

      <nav className="flex-1 space-y-5 px-3 pb-4">
        {navGroups.map((group, i) => {
          if (group.adminOnly && role !== "ADMIN") return null;
          return (
            <div key={i}>
              {group.title && (
                <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive(item.href)
                          ? "border-l-2 border-[#D12351] bg-rose-50 font-medium text-[#D12351]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-3 py-4">
        <button
          onClick={handleLogout}
          className="w-full cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-[#D12351] hover:bg-rose-50 hover:text-[#D12351]"
        >
          登出
        </button>
      </div>
    </aside>
  );
}
