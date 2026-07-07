import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";

type IncomingCard = { key: string; filename?: string | null; mimeType: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id: regionId } = await params;
    const region = await db.salesRegion.findUnique({ where: { id: regionId } });
    if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

    const body = (await req.json()) as { cards?: IncomingCard[] };
    const cards = Array.isArray(body.cards) ? body.cards : [];

    const agg = await db.salesAgent.aggregate({
      where: { regionId },
      _max: { sortOrder: true },
    });
    const baseOrder = (agg._max.sortOrder ?? -1) + 1;

    const created = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card?.key) continue;
      const agent = await db.salesAgent.create({
        data: {
          regionId,
          cardKey: card.key,
          mimeType: card.mimeType,
          filename: card.filename ?? null,
          sortOrder: baseOrder + i,
        },
      });
      created.push({
        id: agent.id,
        url: storage.publicUrl(agent.cardKey),
        mimeType: agent.mimeType,
        filename: agent.filename,
        sortOrder: agent.sortOrder,
      });
      void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "SALES_AGENT", resourceId: agent.id, resourceName: card.filename ?? "業務名片", detail: { regionId, regionName: region.name, filename: card.filename ?? null, mimeType: card.mimeType } });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/sales/regions/[id]/agents]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
