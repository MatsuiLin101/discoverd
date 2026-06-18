import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import SortableHeroBannerList from "@/components/admin/hero-banners/SortableHeroBannerList";

export default async function HeroBannersPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin");

  const bannersRaw = await db.heroBanner.findMany({
    select: { id: true, title: true, imageKey: true, createdAt: true },
    orderBy: { sortOrder: "asc" },
  });
  const banners = bannersRaw.map(({ imageKey, ...b }) => ({
    ...b,
    image: storage.publicUrl(imageKey),
  }));

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">輪播圖管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理前台首頁 Hero 輪播圖片</p>
        </div>
        <Link
          href="/admin/hero-banners/new"
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg hover:opacity-85 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          新增輪播圖
        </Link>
      </div>
      <SortableHeroBannerList banners={banners} />
    </div>
  );
}
