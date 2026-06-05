import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

const schema = z.object({
  tourIds: z.array(z.string()).min(1),
});

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { tourIds } = parsed.data;

  const tours = await db.tour.findMany({
    where: { id: { in: tourIds } },
    include: { files: { select: { publicId: true, mimeType: true } } },
  });

  const deleteJobs: Promise<unknown>[] = [];
  for (const tour of tours) {
    if (tour.thumbnailPublicId) {
      deleteJobs.push(deleteFile(tour.thumbnailPublicId, "image").catch(() => {}));
    }
    for (const file of tour.files) {
      const resourceType = file.mimeType === "application/pdf" ? "raw" : "image";
      deleteJobs.push(deleteFile(file.publicId, resourceType).catch(() => {}));
    }
  }
  await Promise.all(deleteJobs);

  await db.$transaction(tourIds.map((id) => db.tour.delete({ where: { id } })));

  void writeLog({ userId: session.userId, userAccount: session.username, action: "DELETE", resource: "TOUR", resourceId: "batch", resourceName: `批量刪除行程（${tourIds.length} 筆）`, detail: { count: tourIds.length, items: tours.map((t) => ({ id: t.id, name: t.name })) } });
  return NextResponse.json({ ok: true, deleted: tourIds.length });
}
