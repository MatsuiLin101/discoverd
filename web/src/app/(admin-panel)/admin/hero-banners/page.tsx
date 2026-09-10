import Link from "next/link";
import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import SortableHeroBannerList from "@/components/admin/hero-banners/SortableHeroBannerList";
import LayoutSetting from "@/components/admin/hero-banners/LayoutSetting";

export default async function HeroBannersPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));
  if (session.role !== "ADMIN") redirect(adminUrl());

  const [bannersRaw, siteSetting] = await Promise.all([
    db.heroBanner.findMany({
      select: { id: true, title: true, imageKey: true, createdAt: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.siteSetting.findUnique({
      where: { id: "singleton" },
      select: {
        layoutMode: true,
        heroPauseOnHover: true,
        heroMaxHeight: true,
        heroRatio: true,
        boxMaxWidth: true,
        boxOuterBackground: true,
        mobileHeroRatio: true,
      },
    }),
  ]);
  const banners = bannersRaw.map(({ imageKey, ...b }) => ({
    ...b,
    image: storage.publicUrl(imageKey),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">全站版面設定</h1>
        <p className="mt-1 text-sm text-gray-500">設定整站版面與首頁輪播圖</p>
      </div>

      <LayoutSetting
        initialMode={siteSetting?.layoutMode ?? "original"}
        initialPauseOnHover={siteSetting?.heroPauseOnHover ?? true}
        initialMaxHeight={siteSetting?.heroMaxHeight ?? 720}
        initialHeroRatio={siteSetting?.heroRatio ?? "auto"}
        initialBoxWidth={siteSetting?.boxMaxWidth ?? 1320}
        initialOuterBg={siteSetting?.boxOuterBackground ?? "neutral"}
        initialRatio={siteSetting?.mobileHeroRatio ?? "cover"}
      />

      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">輪播圖片</h2>
          <p className="mt-1 text-sm text-gray-500">管理前台首頁 Hero 輪播圖片</p>
        </div>
        <Link
          href={adminUrl("/hero-banners/new")}
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
