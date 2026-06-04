import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const schema = z.object({
  tourIds: z.array(z.string()).min(1),
  published: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { tourIds, published } = parsed.data;

  const tours = await db.tour.findMany({ where: { id: { in: tourIds } }, select: { id: true, name: true } });

  await db.$transaction(
    tourIds.map((id) => db.tour.update({ where: { id }, data: { published } }))
  );

  void writeLog({ userId: session.userId, userEmail: session.email, action: "UPDATE", resource: "TOUR", resourceId: "batch", resourceName: `批量${published ? "發布" : "取消發布"}行程（${tourIds.length} 筆）`, detail: { count: tourIds.length, published, items: tours.map((t) => ({ id: t.id, name: t.name })) } });
  return NextResponse.json({ ok: true, updated: tourIds.length });
}
