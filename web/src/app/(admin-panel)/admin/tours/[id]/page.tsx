import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import TourForm from "@/components/admin/tours/TourForm";

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
      include: {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯旅遊方案</h1>
        <p className="mt-1 text-sm text-gray-500">{tour.name}</p>
      </div>

      <TourForm
        tour={tour}
        regions={regions}
        tags={tags}
        tourId={tour.id}
        initialFiles={tour.files}
        returnUrl={returnUrl}
      />
    </div>
  );
}
