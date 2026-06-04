import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
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
      <AdminLayoutShell role={session.role as "ADMIN" | "STAFF"}>
        {children}
      </AdminLayoutShell>
    </HeartbeatProvider>
  );
}
