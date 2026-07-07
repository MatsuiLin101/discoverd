import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";

const schema = z.object({
  name: z.string().trim().min(1, "請輸入地區名稱").max(50, "名稱過長"),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name } = parsed.data;

  const existing = await db.salesRegion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

  const conflict = await db.salesRegion.findFirst({ where: { name, id: { not: id } } });
  if (conflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });

  const region = await db.salesRegion.update({ where: { id }, data: { name } });
  void writeLog({ userId: session.userId, userAccount: session.username, action: "UPDATE", resource: "SALES_REGION", resourceId: region.id, resourceName: region.name, detail: { id: region.id, name: region.name } });
  return NextResponse.json({ data: region });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id } = await params;
    const region = await db.salesRegion.findUnique({
      where: { id },
      include: { agents: { select: { id: true, cardKey: true } } },
    });
    if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

    // Cascade delete removes agent rows; also purge their stored card files.
    await Promise.all(
      region.agents.map((a) => storage.delete(a.cardKey).catch(() => {}))
    );

    await db.salesRegion.delete({ where: { id } });

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "DELETE",
      resource: "SALES_REGION",
      resourceId: id,
      resourceName: region.name,
      detail: { id, name: region.name, cascadeDeletedAgents: region.agents.length },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/sales/regions/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
