import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import UserEditForm from "@/components/admin/users/UserEditForm";
import ResetPasswordForm from "@/components/admin/users/ResetPasswordForm";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!user) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">編輯使用者</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-700">基本資料</h2>
          <UserEditForm
            userId={user.id}
            initialEmail={user.email}
            initialRole={user.role as "ADMIN" | "STAFF"}
          />
        </section>

        <div className="border-t border-gray-100" />

        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-700">重設密碼</h2>
          <p className="mb-4 text-sm text-gray-500">設定此帳號的新密碼</p>
          <ResetPasswordForm userId={user.id} />
        </section>
      </div>
    </div>
  );
}
