import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import UserCreateForm from "@/components/admin/users/UserCreateForm";

export default async function NewUserPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">新增使用者</h1>
        <p className="mt-1 text-sm text-gray-500">建立一個新的後台帳號</p>
      </div>
      <UserCreateForm />
    </div>
  );
}
