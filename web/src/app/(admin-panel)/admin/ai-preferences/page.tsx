import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import AiPreferencesForm from "@/components/admin/ai-preferences/AiPreferencesForm";

export default async function AiPreferencesPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  return <AiPreferencesForm />;
}
