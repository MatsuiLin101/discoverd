import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  tourIds: z.array(z.string()).min(1),
  subRegionId: z.string().min(1),
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

  const { tourIds, subRegionId } = parsed.data;

  const subRegion = await db.subRegion.findUnique({ where: { id: subRegionId } });
  if (!subRegion) {
    return NextResponse.json({ error: "找不到此次分類" }, { status: 404 });
  }

  await db.$transaction(
    tourIds.map((id) => db.tour.update({ where: { id }, data: { subRegionId } }))
  );

  return NextResponse.json({ ok: true, updated: tourIds.length });
}
