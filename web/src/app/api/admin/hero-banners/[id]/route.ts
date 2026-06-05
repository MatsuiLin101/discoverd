import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

const schema = z.object({
  title: z.string().min(1, "標題不可為空"),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const { id } = await params;
  const fd = await req.formData();
  const parsed = schema.safeParse({ title: fd.get("title") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title } = parsed.data;

  const existing = await db.heroBanner.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到此輪播圖" }, { status: 404 });

  let image = existing.image;
  let imagePublicId = existing.imagePublicId;
  let imageChange = "unchanged";

  const file = fd.get("image") as File | null;
  if (file && file.size > 0) {
    await deleteFile(existing.imagePublicId, "image").catch(() => {});
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder: "hero-banners", mimeType: file.type });
    image = result.url;
    imagePublicId = result.publicId;
    imageChange = "replaced";
  }

  const banner = await db.heroBanner.update({
    where: { id },
    data: { title, image, imagePublicId },
  });
  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "HERO_BANNER",
    resourceId: banner.id,
    resourceName: banner.title,
    detail: { id: banner.id, title: banner.title, imageChange },
  });
  return NextResponse.json({ data: banner });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 403 });
    }

    const { id } = await params;
    const banner = await db.heroBanner.findUnique({ where: { id } });
    if (!banner) return NextResponse.json({ error: "找不到此輪播圖" }, { status: 404 });

    await deleteFile(banner.imagePublicId, "image").catch(() => {});
    await db.heroBanner.delete({ where: { id } });

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "DELETE",
      resource: "HERO_BANNER",
      resourceId: id,
      resourceName: banner.title,
      detail: { id, title: banner.title },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/hero-banners/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
