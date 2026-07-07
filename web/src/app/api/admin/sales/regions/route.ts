import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const schema = z.object({
  name: z.string().trim().min(1, "請輸入地區名稱").max(50, "名稱過長"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name } = parsed.data;

  const conflict = await db.salesRegion.findUnique({ where: { name } });
  if (conflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });

  const max = await db.salesRegion.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const region = await db.salesRegion.create({ data: { name, sortOrder } });
  void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "SALES_REGION", resourceId: region.id, resourceName: region.name, detail: { id: region.id, name: region.name } });
  return NextResponse.json({ data: region }, { status: 201 });
}
