import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import TourForm from "@/components/admin/tours/TourForm";

const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

export default async function EditTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [{ id }, { returnUrl }] = await Promise.all([params, searchParams]);

  const [tour, regions, tags] = await Promise.all([
    db.tour.findUnique({
      where: { id },
      select: {
        id: true, name: true, price: true, description: true, thumbnailKey: true,
        published: true, subRegionId: true, slug: true,
        seoTitle: true, seoDescription: true, ogImageKey: true,
        tags: { select: { id: true } },
        files: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.region.findMany({
      include: { subRegions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.tag.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  if (!tour) notFound();

  const { thumbnailKey, ogImageKey, files, ...rest } = tour;
  const tourForForm = {
    ...rest,
    thumbnail: urlOf(thumbnailKey),
    ogImage: urlOf(ogImageKey),
  };
  const initialFiles = files.map((f) => ({
    id: f.id,
    url: storage.publicUrl(f.key),
    mimeType: f.mimeType,
    filename: f.filename,
    sortOrder: f.sortOrder,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯旅遊方案</h1>
        <p className="mt-1 text-sm text-gray-500">{tour.name}</p>
      </div>

      <TourForm
        tour={tourForForm}
        regions={regions}
        tags={tags}
        tourId={tour.id}
        initialFiles={initialFiles}
        returnUrl={returnUrl}
      />
    </div>
  );
}
