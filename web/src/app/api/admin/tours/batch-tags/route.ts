import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  tourIds: z.array(z.string()).min(1),
  action: z.enum(["add", "remove"]),
  tagIds: z.array(z.string()).min(1),
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

  const { tourIds, action, tagIds } = parsed.data;
  const tagConnect = tagIds.map((id) => ({ id }));

  await db.$transaction(
    tourIds.map((tourId) =>
      db.tour.update({
        where: { id: tourId },
        data: {
          tags: action === "add" ? { connect: tagConnect } : { disconnect: tagConnect },
        },
      })
    )
  );

  return NextResponse.json({ ok: true, updated: tourIds.length });
}
