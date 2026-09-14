import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import AiUsageList from "@/components/admin/ai-usage/AiUsageList";

export default async function AiUsagePage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  return <AiUsageList />;
}
