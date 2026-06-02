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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">標籤管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理旅遊方案標籤</p>
        </div>
        <Link
          href="/admin/tags/new"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: "#D12351" }}
        >
          新增標籤
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">標籤名稱</th>
              <th className="px-4 py-3 font-medium text-gray-600">使用次數</th>
              <th className="px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
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
                    <Link
                      href={`/admin/tags/${tag.id}`}
                      className="text-gray-500 hover:text-gray-800"
                    >
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
