import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import AiSettingsForm from "@/components/admin/ai-settings/AiSettingsForm";

export default async function AiSettingsPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));
  if (session.role !== "ADMIN") redirect(adminUrl());

  return <AiSettingsForm />;
}
