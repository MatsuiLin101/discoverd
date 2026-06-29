import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import SettingsForm from "@/components/admin/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));
  if (session.role !== "ADMIN") redirect(adminUrl());

  return <SettingsForm />;
}
