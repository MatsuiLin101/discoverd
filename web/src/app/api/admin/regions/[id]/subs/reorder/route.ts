import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const schema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })).min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const { id: regionId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.items.map(({ id, sortOrder }) =>
      db.subRegion.update({ where: { id, regionId }, data: { sortOrder } })
    )
  );

  const count = parsed.data.items.length;
  void writeLog({ userId: session.userId, userEmail: session.email, action: "REORDER", resource: "SUB_REGION", resourceId: regionId, resourceName: "次分類排序", detail: { count } });
  return NextResponse.json({ ok: true });
}
