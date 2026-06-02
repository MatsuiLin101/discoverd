import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RegionForm from "@/components/admin/regions/RegionForm";

export default async function NewRegionPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">新增主分類</h1>
        <p className="mt-1 text-sm text-gray-500">建立一個新的地區主分類</p>
      </div>
      <RegionForm />
    </div>
  );
}
