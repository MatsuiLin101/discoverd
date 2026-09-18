import { Suspense } from "react";
import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AnalyticsPanel, { AnalyticsPanelSkeleton } from "@/components/admin/dashboard/AnalyticsPanel";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { username: true, displayName: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
          歡迎回來，<span className="break-all">{user?.displayName ?? user?.username}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">網站數據總覽</p>
      </div>

      <Suspense fallback={<AnalyticsPanelSkeleton />}>
        <AnalyticsPanel />
      </Suspense>
    </div>
  );
}
