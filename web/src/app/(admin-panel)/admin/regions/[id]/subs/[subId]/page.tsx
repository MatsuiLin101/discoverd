import { notFound, redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { normalizeCrop } from "@/lib/crop";
import SubRegionForm from "@/components/admin/regions/SubRegionForm";

const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

export default async function EditSubRegionPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  const { id, subId } = await params;
  const [region, sub] = await Promise.all([
    db.region.findUnique({ where: { id }, select: { id: true, name: true } }),
    db.subRegion.findUnique({
      where: { id: subId },
      select: { id: true, name: true, slug: true, thumbnailKey: true, thumbnailCrop: true, regionId: true, seoTitle: true, seoDescription: true, ogImageKey: true },
    }),
  ]);
  if (!region || !sub || sub.regionId !== id) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯次分類</h1>
        <p className="mt-1 text-sm text-gray-500">
          {region.name} &gt; {sub.name}
        </p>
      </div>
      <SubRegionForm
        regionId={region.id}
        regionName={region.name}
        subId={sub.id}
        initialName={sub.name}
        initialSlug={sub.slug}
        initialThumbnail={urlOf(sub.thumbnailKey)}
        initialThumbnailCrop={normalizeCrop(sub.thumbnailCrop)}
        initialSeoTitle={sub.seoTitle}
        initialSeoDescription={sub.seoDescription}
        initialOgImage={urlOf(sub.ogImageKey)}
      />
    </div>
  );
}
