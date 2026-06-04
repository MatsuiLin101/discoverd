import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import DeleteTagButton from "@/components/admin/tags/DeleteTagButton";

export default async function TagsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const tags = await db.tag.findMany({
    include: { _count: { select: { tours: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">標籤管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理旅遊方案標籤</p>
        </div>
        <Link
          href="/admin/tags/new"
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg hover:opacity-85 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          新增標籤
        </Link>
      </div>

      {/* 手機卡片 */}
      {tags.length === 0 ? (
        <p className="px-4 py-8 text-sm text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
          尚無標籤
        </p>
      ) : (
        <div className="space-y-2 md:hidden">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{tag.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">使用 {tag._count.tours} 次</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={`/admin/tags/${tag.id}`} className="text-sm text-gray-500 hover:text-gray-800">
                  編輯
                </Link>
                <DeleteTagButton tagId={tag.id} tourCount={tag._count.tours} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 桌機表格 */}
      <div className="hidden overflow-hidden bg-white border border-gray-200 md:block rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">標籤名稱</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">使用次數</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-sm text-center text-gray-400">
                  尚無標籤
                </td>
              </tr>
            )}
            {tags.map((tag) => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{tag.name}</td>
                <td className="px-4 py-3 text-gray-500">{tag._count.tours}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/tags/${tag.id}`} className="text-gray-500 hover:text-gray-800 whitespace-nowrap">
                      編輯
                    </Link>
                    <DeleteTagButton tagId={tag.id} tourCount={tag._count.tours} />
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
