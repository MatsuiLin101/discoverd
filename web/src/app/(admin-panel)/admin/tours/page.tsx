import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DeleteTourButton from "@/components/admin/tours/DeleteTourButton";

export default async function ToursPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const tours = await db.tour.findMany({
    include: {
      subRegion: { include: { region: true } },
      tags: true,
      _count: { select: { files: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">縮圖</th>
              <th className="px-4 py-3 font-medium text-gray-600">名稱</th>
              <th className="px-4 py-3 font-medium text-gray-600">分類</th>
              <th className="px-4 py-3 font-medium text-gray-600">價格</th>
              <th className="px-4 py-3 font-medium text-gray-600">標籤</th>
              <th className="px-4 py-3 font-medium text-gray-600">檔案</th>
              <th className="px-4 py-3 font-medium text-gray-600">狀態</th>
              <th className="px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {tours.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  尚無旅遊方案，請點擊右上角新增
                </td>
              </tr>
            )}
            {tours.map((tour) => (
              <tr key={tour.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="relative h-10 w-14 overflow-hidden rounded bg-gray-100">
                    <Image
                      src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
                      alt={tour.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{tour.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {tour.subRegion.region.name} › {tour.subRegion.name}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  NT${tour.price.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {tour.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {tour.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{tour.tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{tour._count.files} 個</td>
                <td className="px-4 py-3">
                  {tour.published ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                      已發布
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      未發布
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/tours/${tour.id}`}
                      className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                    >
                      編輯
                    </Link>
                    <DeleteTourButton tourId={tour.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
