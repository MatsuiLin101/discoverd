import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const quickLinks = [
  { label: "地區管理", href: "/admin/regions", desc: "管理地區與子地區" },
  { label: "標籤管理", href: "/admin/tags", desc: "管理旅遊方案標籤" },
  { label: "旅遊方案", href: "/admin/tours", desc: "管理旅遊方案與行程" },
  { label: "客戶諮詢", href: "/admin/inquiries", desc: "查看客戶諮詢記錄" },
];

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
          歡迎回來，<span className="break-all">{user?.email}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">選擇一個功能開始管理</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="p-4 transition-shadow bg-white border border-gray-200 rounded-xl hover:shadow-md sm:p-5"
          >
            <p className="font-medium text-gray-800">{link.label}</p>
            <p className="mt-1 text-xs text-gray-400">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
