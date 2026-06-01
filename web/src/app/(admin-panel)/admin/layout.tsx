import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import HeartbeatProvider from "@/components/admin/HeartbeatProvider";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <HeartbeatProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: "#fffcfd" }}>
        <AdminSidebar role={session.role as "ADMIN" | "STAFF"} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </HeartbeatProvider>
  );
}
