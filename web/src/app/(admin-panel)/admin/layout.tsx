import { redirect } from "next/navigation";
import { getSession, deleteSession } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    await deleteSession(); // clear stale cookie to break proxy.ts redirect loop
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#fffcfd" }}>
      <AdminSidebar role={session.role as "ADMIN" | "STAFF"} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
