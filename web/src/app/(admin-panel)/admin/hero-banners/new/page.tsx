import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import HeroBannerForm from "@/components/admin/hero-banners/HeroBannerForm";

export default async function NewHeroBannerPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">新增輪播圖</h1>
        <p className="mt-1 text-sm text-gray-500">上傳一張圖片作為首頁 Hero 輪播</p>
      </div>
      <HeroBannerForm />
    </div>
  );
}
