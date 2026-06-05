import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import HeroBannerForm from "@/components/admin/hero-banners/HeroBannerForm";

export default async function EditHeroBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const banner = await db.heroBanner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">編輯輪播圖</h1>
        <p className="mt-1 text-sm text-gray-500">{banner.title}</p>
      </div>
      <HeroBannerForm
        bannerId={banner.id}
        initialTitle={banner.title}
        initialImage={banner.image}
      />
    </div>
  );
}
