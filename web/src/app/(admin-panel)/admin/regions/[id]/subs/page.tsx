import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SortableSubRegionList from "@/components/admin/regions/SortableSubRegionList";

export default async function SubRegionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const region = await db.region.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      subRegions: {
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          _count: { select: { tours: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!region) notFound();

  return (
    <div>
      <div className="mb-1">
        <Link href="/admin/regions" className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回地區列表
        </Link>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {region.name} &gt; 次分類管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">管理此主分類下的次分類</p>
        </div>
        <Link
          href={`/admin/regions/${id}/subs/new`}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: "#D12351" }}
        >
          新增次分類
        </Link>
      </div>
      <SortableSubRegionList regionId={id} subs={region.subRegions} />
    </div>
  );
}
