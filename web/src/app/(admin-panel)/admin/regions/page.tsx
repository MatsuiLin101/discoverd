import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SortableRegionList from "@/components/admin/regions/SortableRegionList";

export default async function RegionsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const regionsRaw = await db.region.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnail: true,
      _count: { select: { subRegions: true } },
      subRegions: { select: { name: true, _count: { select: { tours: true } } } },
    },
    orderBy: { sortOrder: "asc" },
  });
  const regions = regionsRaw.map(({ subRegions, ...r }) => ({
    ...r,
    tourCount: subRegions.reduce((sum, s) => sum + s._count.tours, 0),
    subRegionNames: subRegions.map(s => s.name),
  }));

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">地區管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理前台地區分類</p>
        </div>
        <Link
          href="/admin/regions/new"
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg hover:opacity-85 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          新增主分類
        </Link>
      </div>
      <SortableRegionList regions={regions} />
    </div>
  );
}
