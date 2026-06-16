import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";

type IncomingFile = { key: string; filename: string; mimeType: string };

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

    const body = (await req.json()) as { files?: IncomingFile[] };
    const files = Array.isArray(body.files) ? body.files : [];

    const agg = await db.tourFile.aggregate({
      where: { tourId },
      _max: { sortOrder: true },
    });
    const baseOrder = (agg._max.sortOrder ?? -1) + 1;

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file?.key) continue;
      const tourFile = await db.tourFile.create({
        data: {
          tourId,
          key: file.key,
          mimeType: file.mimeType,
          filename: file.filename,
          sortOrder: baseOrder + i,
        },
      });
      created.push({ ...tourFile, url: storage.publicUrl(tourFile.key) });
      void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "TOUR_FILE", resourceId: tourFile.id, resourceName: file.filename, detail: { tourId, tourName: tour.name, filename: file.filename, mimeType: file.mimeType } });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours/[id]/files]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
