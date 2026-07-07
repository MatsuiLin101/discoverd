import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-path";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import SalesAgentManager from "@/components/admin/sales/SalesAgentManager";

export default async function SalesAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(adminUrl("/login"));

  const { id } = await params;
  const region = await db.salesRegion.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      agents: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, cardKey: true, mimeType: true, filename: true, sortOrder: true },
      },
    },
  });
  if (!region) notFound();

  const agents = region.agents.map((a) => ({
    id: a.id,
    url: storage.publicUrl(a.cardKey),
    mimeType: a.mimeType,
    filename: a.filename,
    sortOrder: a.sortOrder,
  }));

  return (
    <div>
      <div className="mb-1">
        <Link href={adminUrl("/sales")} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回業務資訊
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{region.name} &gt; 業務名片</h1>
        <p className="mt-1 text-sm text-gray-500">上傳業務名片檔案即可新增，可拖曳排序</p>
      </div>
      <SalesAgentManager regionId={id} initialAgents={agents} />
    </div>
  );
}
