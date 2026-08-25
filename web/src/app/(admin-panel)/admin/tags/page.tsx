import Link from "next/link";
import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SortableTagList from "@/components/admin/tags/SortableTagList";
import ImportExportPanel from "@/components/admin/ImportExportPanel";

export default async function TagsPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  const tagsRaw = await db.tag.findMany({
    include: { _count: { select: { tours: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const tags = tagsRaw.map(({ _count, ...t }) => ({
    ...t,
    tourCount: _count.tours,
  }));

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">標籤管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理旅遊方案標籤</p>
        </div>
        <Link
          href={adminUrl("/tags/new")}
          className="px-4 py-2 text-sm font-medium text-white transition-opacity rounded-lg hover:opacity-85 whitespace-nowrap"
          style={{ backgroundColor: "#D12351" }}
        >
          新增標籤
        </Link>
      </div>

      <div className="mb-6">
        <ImportExportPanel
          moduleLabel="標籤"
          exportHref="/api/admin/tags/export"
          templateHref="/api/admin/tags/export?template=1"
          previewUrl="/api/admin/tags/import/preview"
          commitUrl="/api/admin/tags/import/commit"
          columnsHint="標籤名稱"
        />
      </div>

      <SortableTagList tags={tags} />
    </div>
  );
}
