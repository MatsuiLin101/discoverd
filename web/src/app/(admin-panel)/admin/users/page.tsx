import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">使用者管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理後台使用者帳號</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-sm text-gray-400">功能開發中</p>
      </div>
    </div>
  );
}
