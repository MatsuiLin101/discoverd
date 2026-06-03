import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import TourFilterBar from "@/components/admin/tours/TourFilterBar";
import TourListClient from "@/components/admin/tours/TourListClient";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    regionId?: string;
    subRegionId?: string;
    tagId?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { q, regionId, subRegionId, tagId } = await searchParams;
  const hasFilters = !!(q || regionId || subRegionId || tagId);

  const where: Prisma.TourWhereInput = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (subRegionId) where.subRegionId = subRegionId;
  else if (regionId) where.subRegion = { regionId };
  if (tagId) where.tags = { some: { id: tagId } };

  const [tours, regions, tags] = await Promise.all([
    db.tour.findMany({
      where,
      include: {
        subRegion: { include: { region: true } },
        tags: true,
        _count: { select: { files: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.region.findMany({
      select: {
        id: true,
        name: true,
        subRegions: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.tag.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const listKey = `${q ?? ""}|${regionId ?? ""}|${subRegionId ?? ""}|${tagId ?? ""}`;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">旅遊方案</h1>
          <p className="mt-1 text-sm text-gray-500">管理旅遊方案與行程</p>
        </div>
        <Link
          href="/admin/tours/new"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#D12351" }}
        >
          + 新增旅遊方案
        </Link>
      </div>

      <Suspense>
        <TourFilterBar regions={regions} tags={tags} />
      </Suspense>
      <TourListClient key={listKey} tours={tours} tags={tags} hasFilters={hasFilters} />
    </div>
  );
}
