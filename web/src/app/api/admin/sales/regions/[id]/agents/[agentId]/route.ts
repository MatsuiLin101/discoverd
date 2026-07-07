import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id: regionId, agentId } = await params;
    const agent = await db.salesAgent.findFirst({ where: { id: agentId, regionId } });
    if (!agent) return NextResponse.json({ error: "找不到此業務名片" }, { status: 404 });

    await storage.delete(agent.cardKey).catch(() => {});
    await db.salesAgent.delete({ where: { id: agentId } });

    void writeLog({ userId: session.userId, userAccount: session.username, action: "DELETE", resource: "SALES_AGENT", resourceId: agentId, resourceName: agent.filename ?? agentId, detail: { regionId, filename: agent.filename } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/sales/regions/[id]/agents/[agentId]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
