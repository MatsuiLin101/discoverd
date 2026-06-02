import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TagForm from "@/components/admin/tags/TagForm";

export default async function NewTagPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">新增標籤</h1>
        <p className="mt-1 text-sm text-gray-500">建立一個新的旅遊方案標籤</p>
      </div>
      <TagForm />
    </div>
  );
}
