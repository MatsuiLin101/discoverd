import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import LogList from "@/components/admin/logs/LogList";

export default async function LogsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const users = await db.user.findMany({
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">操作日誌</h1>
        <p className="mt-1 text-sm text-gray-500">檢視所有後台操作記錄</p>
      </div>
      <LogList users={users} />
    </div>
  );
}
