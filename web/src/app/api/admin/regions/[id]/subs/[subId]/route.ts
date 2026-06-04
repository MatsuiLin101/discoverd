import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/cloudinary";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const { id: regionId, subId } = await params;
  const fd = await req.formData();
  const parsed = schema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug } = parsed.data;

  const existing = await db.subRegion.findUnique({ where: { id: subId } });
  if (!existing || existing.regionId !== regionId) {
    return NextResponse.json({ error: "找不到此次分類" }, { status: 404 });
  }

  const slugConflict = await db.subRegion.findFirst({
    where: { regionId, slug, id: { not: subId } },
  });
  if (slugConflict) return NextResponse.json({ error: "此 slug 在此主分類下已存在" }, { status: 409 });

  let thumbnail = existing.thumbnail ?? undefined;
  let thumbnailPublicId = existing.thumbnailPublicId ?? undefined;

  const file = fd.get("thumbnail") as File | null;
  if (file && file.size > 0) {
    if (existing.thumbnailPublicId) {
      await deleteFile(existing.thumbnailPublicId, "image").catch(() => {});
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder: "regions", mimeType: file.type });
    thumbnail = result.url;
    thumbnailPublicId = result.publicId;
  }

  const sub = await db.subRegion.update({
    where: { id: subId },
    data: { name, slug, thumbnail, thumbnailPublicId },
  });
  return NextResponse.json({ data: sub });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const { id: regionId, subId } = await params;
  const sub = await db.subRegion.findUnique({
    where: { id: subId },
    include: { _count: { select: { tours: true } } },
  });
  if (!sub || sub.regionId !== regionId) {
    return NextResponse.json({ error: "找不到此次分類" }, { status: 404 });
  }
  if (sub._count.tours > 0) {
    return NextResponse.json(
      { error: "此次分類下還有旅遊方案，無法刪除" },
      { status: 409 }
    );
  }

  if (sub.thumbnailPublicId) {
    await deleteFile(sub.thumbnailPublicId, "image").catch(() => {});
  }
  await db.subRegion.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}
