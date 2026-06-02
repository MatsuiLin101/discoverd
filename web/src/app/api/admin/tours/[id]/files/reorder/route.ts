import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id: tourId } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });

    const { items } = parsed.data;
    await db.$transaction(
      items.map(({ id, sortOrder }) =>
        db.tourFile.update({ where: { id, tourId }, data: { sortOrder } })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/admin/tours/[id]/files/reorder]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
