import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import RegionForm from "@/components/admin/regions/RegionForm";

export default async function EditRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const region = await db.region.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, thumbnail: true },
  });
  if (!region) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯主分類</h1>
        <p className="mt-1 text-sm text-gray-500">{region.name}</p>
      </div>
      <RegionForm
        regionId={region.id}
        initialName={region.name}
        initialSlug={region.slug}
        initialThumbnail={region.thumbnail}
      />
    </div>
  );
}
