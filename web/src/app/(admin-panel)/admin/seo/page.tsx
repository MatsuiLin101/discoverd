import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import SeoSettingsForm from "@/components/admin/seo/SeoSettingsForm";

export default async function SeoSettingsPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  return <SeoSettingsForm />;
}
