import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SettingsForm from "@/components/admin/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin");

  return <SettingsForm />;
}
