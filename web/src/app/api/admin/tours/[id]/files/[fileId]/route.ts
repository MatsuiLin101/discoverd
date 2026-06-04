import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id: tourId, fileId } = await params;
    const file = await db.tourFile.findFirst({ where: { id: fileId, tourId } });
    if (!file) return NextResponse.json({ error: "找不到此檔案" }, { status: 404 });

    const resourceType = file.mimeType === "application/pdf" ? "raw" : "image";
    await deleteFile(file.publicId, resourceType).catch(() => {});
    await db.tourFile.delete({ where: { id: fileId } });

    void writeLog({ userId: session.userId, userEmail: session.email, action: "DELETE", resource: "TOUR_FILE", resourceId: fileId, resourceName: file.filename ?? fileId, detail: { tourId, filename: file.filename } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/tours/[id]/files/[fileId]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
