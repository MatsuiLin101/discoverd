import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SortableRegionList from "@/components/admin/regions/SortableRegionList";

export default async function RegionsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const regions = await db.region.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnail: true,
      _count: { select: { subRegions: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">地區管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理前台地區分類</p>
        </div>
        <Link
          href="/admin/regions/new"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: "#D12351" }}
        >
          新增主分類
        </Link>
      </div>
      <SortableRegionList regions={regions} />
    </div>
  );
}
