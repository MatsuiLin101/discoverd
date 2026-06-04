import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DeleteUserButton from "@/components/admin/users/DeleteUserButton";

const roleLabel: Record<string, string> = {
  ADMIN: "管理員",
  STAFF: "一般帳號",
};

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const users = await db.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">使用者管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理後台使用者帳號</p>
        </div>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg whitespace-nowrap hover:opacity-85"
          style={{ backgroundColor: "#D12351" }}
        >
          新增使用者
        </Link>
      </div>

      {/* 手機卡片 */}
      <div className="space-y-2 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="px-4 py-3 space-y-2 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 break-all">
                {user.email}
                {user.id === session.userId && (
                  <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    我
                  </span>
                )}
              </p>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  user.role === "ADMIN"
                    ? "bg-rose-50 text-[#D12351]"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {roleLabel[user.role]}
              </span>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap">{user.createdAt.toLocaleDateString("zh-TW")}</p>
            <div className="flex items-center gap-4">
              <Link href={`/admin/users/${user.id}`} className="text-sm text-gray-500 hover:text-gray-800 whitespace-nowrap">
                編輯
              </Link>
              <DeleteUserButton userId={user.id} isSelf={user.id === session.userId} />
            </div>
          </div>
        ))}
      </div>

      {/* 桌機表格 */}
      <div className="hidden overflow-hidden bg-white border border-gray-200 md:block rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">角色</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">建立時間</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">
                  {user.email}
                  {user.id === session.userId && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      我
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full whitespace-nowrap px-2.5 py-0.5 text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-rose-50 text-[#D12351]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {roleLabel[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {user.createdAt.toLocaleDateString("zh-TW")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/users/${user.id}`} className="text-gray-500 hover:text-gray-800 whitespace-nowrap">
                      編輯
                    </Link>
                    <DeleteUserButton userId={user.id} isSelf={user.id === session.userId} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
