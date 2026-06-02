import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TagForm from "@/components/admin/tags/TagForm";

export default async function EditTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const tag = await db.tag.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!tag) redirect("/admin/tags");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯標籤</h1>
        <p className="mt-1 text-sm text-gray-500">修改標籤名稱</p>
      </div>
      <TagForm tag={tag} />
    </div>
  );
}
