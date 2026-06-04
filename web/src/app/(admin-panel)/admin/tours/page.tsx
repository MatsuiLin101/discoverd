import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import TourFilterBar from "@/components/admin/tours/TourFilterBar";
import TourListClient from "@/components/admin/tours/TourListClient";

const VALID_LIMITS = [0, 10, 20, 50, 100];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    regionId?: string;
    subRegionId?: string;
    tagIds?: string;
    published?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { q, regionId, subRegionId, tagIds, published, page: pageParam, limit: limitParam } =
    await searchParams;

  const tagIdList = tagIds ? tagIds.split(",").filter(Boolean) : [];
  const hasFilters = !!(q || regionId || subRegionId || tagIdList.length > 0 || published);

  const parsedLimit = parseInt(limitParam ?? "20", 10);
  const pageSize = VALID_LIMITS.includes(parsedLimit) ? parsedLimit : 20;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = pageSize === 0 ? undefined : (currentPage - 1) * pageSize;
  const take = pageSize === 0 ? undefined : pageSize;

  const where: Prisma.TourWhereInput = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (subRegionId) where.subRegionId = subRegionId;
  else if (regionId) where.subRegion = { regionId };
  if (tagIdList.length > 0) where.tags = { some: { id: { in: tagIdList } } };
  if (published === "true") where.published = true;
  else if (published === "false") where.published = false;

  const [tours, filteredCount, allCount, regions, tags] = await Promise.all([
    db.tour.findMany({
      where,
      include: {
        subRegion: { include: { region: true } },
        tags: true,
        _count: { select: { files: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
    }),
    db.tour.count({ where }),
    db.tour.count(),
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

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredCount / pageSize);

  const baseQs = new URLSearchParams();
  if (q) baseQs.set("q", q);
  if (regionId) baseQs.set("regionId", regionId);
  if (subRegionId) baseQs.set("subRegionId", subRegionId);
  if (tagIds) baseQs.set("tagIds", tagIds);
  if (published) baseQs.set("published", published);
  if (pageSize !== 20) baseQs.set("limit", String(pageSize));

  function pageHref(p: number) {
    const ps = new URLSearchParams(baseQs.toString());
    if (p > 1) ps.set("page", String(p));
    const qs = ps.toString();
    return `/admin/tours${qs ? `?${qs}` : ""}`;
  }

  const prevHref = currentPage > 1 ? pageHref(currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? pageHref(currentPage + 1) : null;

  const listKey = `${q ?? ""}|${regionId ?? ""}|${subRegionId ?? ""}|${tagIds ?? ""}|${published ?? ""}|${currentPage}|${pageSize}`;

  const returnUrlQs = new URLSearchParams(baseQs.toString());
  if (currentPage > 1) returnUrlQs.set("page", String(currentPage));
  const returnUrl = `/admin/tours${returnUrlQs.toString() ? `?${returnUrlQs.toString()}` : ""}`;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">旅遊方案</h1>
          <p className="mt-1 text-sm text-gray-500">管理旅遊方案與行程</p>
        </div>
        <Link
          href={`/admin/tours/new?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg hover:opacity-85 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          新增旅遊方案
        </Link>
      </div>

      <Suspense>
        <TourFilterBar regions={regions} tags={tags} />
      </Suspense>

      <p className="mb-2 text-xs text-gray-400">
        {hasFilters
          ? `篩選後 ${filteredCount} 筆（共 ${allCount} 筆）`
          : `共 ${allCount} 筆`}
      </p>

      <TourListClient
        key={listKey}
        tours={tours}
        tags={tags}
        regions={regions}
        hasFilters={hasFilters}
        filteredCount={filteredCount}
        allCount={allCount}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        prevHref={prevHref}
        nextHref={nextHref}
        returnUrl={returnUrl}
      />
    </div>
  );
}
