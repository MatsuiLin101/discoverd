import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SubRegionForm from "@/components/admin/regions/SubRegionForm";

export default async function NewSubRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const { id } = await params;
  const region = await db.region.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!region) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">新增次分類</h1>
        <p className="mt-1 text-sm text-gray-500">{region.name}</p>
      </div>
      <SubRegionForm regionId={region.id} regionName={region.name} />
    </div>
  );
}
