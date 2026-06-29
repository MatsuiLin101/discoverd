import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminUrl, getAdminPath } from "@/lib/admin-path";
import { AdminPathProvider } from "@/components/admin/AdminPathProvider";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import HeartbeatProvider from "@/components/admin/HeartbeatProvider";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  return (
    <AdminPathProvider value={getAdminPath()}>
      <HeartbeatProvider>
        <AdminLayoutShell role={session.role as "ADMIN" | "STAFF"}>
          {children}
        </AdminLayoutShell>
      </HeartbeatProvider>
    </AdminPathProvider>
  );
}
