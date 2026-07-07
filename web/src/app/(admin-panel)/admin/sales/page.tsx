import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SortableSalesRegionList from "@/components/admin/sales/SortableSalesRegionList";

export default async function SalesRegionsPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));
  if (session.role !== "ADMIN") redirect(adminUrl());

  const regionsRaw = await db.salesRegion.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { agents: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  const regions = regionsRaw.map((r) => ({
    id: r.id,
    name: r.name,
    agentCount: r._count.agents,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">業務資訊</h1>
        <p className="mt-1 text-sm text-gray-500">管理前台業務團隊地區與名片，可拖曳排序</p>
      </div>
      <SortableSalesRegionList regions={regions} />
    </div>
  );
}
