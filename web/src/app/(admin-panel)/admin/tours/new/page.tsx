import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TourForm from "@/components/admin/tours/TourForm";

export default async function NewTourPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [{ returnUrl }, regions, tags] = await Promise.all([
    searchParams,
    db.region.findMany({
      include: { subRegions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.tag.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">新增旅遊方案</h1>
        <p className="mt-1 text-sm text-gray-500">填寫行程基本資訊與上傳內容</p>
      </div>
      <TourForm regions={regions} tags={tags} returnUrl={returnUrl} />
    </div>
  );
}
