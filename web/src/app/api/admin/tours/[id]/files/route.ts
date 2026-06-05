import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id: tourId } = await params;
    const tour = await db.tour.findUnique({ where: { id: tourId } });
    if (!tour) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    const fd = await req.formData();
    const files = fd.getAll("files") as File[];

    const agg = await db.tourFile.aggregate({
      where: { tourId },
      _max: { sortOrder: true },
    });
    const baseOrder = (agg._max.sortOrder ?? -1) + 1;

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, { folder: "tour-files", mimeType: file.type });
      const tourFile = await db.tourFile.create({
        data: {
          tourId,
          url: result.url,
          publicId: result.publicId,
          mimeType: result.mimeType,
          filename: file.name,
          sortOrder: baseOrder + i,
        },
      });
      created.push(tourFile);
      void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "TOUR_FILE", resourceId: tourFile.id, resourceName: file.name, detail: { tourId, tourName: tour.name, filename: file.name, mimeType: file.type } });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/files]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
