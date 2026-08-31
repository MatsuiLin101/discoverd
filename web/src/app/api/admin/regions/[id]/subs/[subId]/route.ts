import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";
import { parseCropField } from "@/lib/crop";
import { Prisma } from "@/generated/prisma/client";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
  seoTitle: z.string().max(100).optional(),
  seoDescription: z.string().max(160).optional(),
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
  const rawSeoTitle = fd.get("seoTitle");
  const rawSeoDescription = fd.get("seoDescription");
  const parsed = schema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
    seoTitle: typeof rawSeoTitle === "string" && rawSeoTitle ? rawSeoTitle : undefined,
    seoDescription: typeof rawSeoDescription === "string" && rawSeoDescription ? rawSeoDescription : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug, seoTitle, seoDescription } = parsed.data;

  const existing = await db.subRegion.findUnique({ where: { id: subId } });
  if (!existing || existing.regionId !== regionId) {
    return NextResponse.json({ error: "找不到此次分類" }, { status: 404 });
  }

  const slugConflict = await db.subRegion.findFirst({
    where: { regionId, slug, id: { not: subId } },
  });
  if (slugConflict) return NextResponse.json({ error: "此 slug 在此主分類下已存在" }, { status: 409 });

  let thumbnailKey: string | null = existing.thumbnailKey;
  const newThumbnailKey = (fd.get("thumbnailKey") as string) || null;
  const clearThumbnail = fd.get("clearThumbnail") === "true";

  if (clearThumbnail && !newThumbnailKey) {
    if (existing.thumbnailKey) await storage.delete(existing.thumbnailKey).catch(() => {});
    thumbnailKey = null;
  } else if (newThumbnailKey) {
    if (existing.thumbnailKey) await storage.delete(existing.thumbnailKey).catch(() => {});
    thumbnailKey = newThumbnailKey;
  }

  const thumbnailCrop = thumbnailKey ? parseCropField(fd.get("thumbnailCrop")) : null;

  let ogImageKey: string | null = existing.ogImageKey;
  const newOgImageKey = (fd.get("ogImageKey") as string) || null;
  const clearOgImage = fd.get("clearOgImage") === "true";

  if (clearOgImage && !newOgImageKey) {
    if (existing.ogImageKey) await storage.delete(existing.ogImageKey).catch(() => {});
    ogImageKey = null;
  } else if (newOgImageKey) {
    if (existing.ogImageKey) await storage.delete(existing.ogImageKey).catch(() => {});
    ogImageKey = newOgImageKey;
  }

  const sub = await db.subRegion.update({
    where: { id: subId },
    data: { name, slug, thumbnailKey, thumbnailCrop: thumbnailCrop ?? Prisma.DbNull, seoTitle: seoTitle ?? null, seoDescription: seoDescription ?? null, ogImageKey },
  });
  const thumbnailChange = clearThumbnail && !newThumbnailKey
    ? "removed"
    : newThumbnailKey
      ? (existing.thumbnailKey ? "replaced" : "added")
      : "unchanged";
  const ogImageChange = clearOgImage && !newOgImageKey
    ? "removed"
    : newOgImageKey
      ? (existing.ogImageKey ? "replaced" : "added")
      : "unchanged";
  void writeLog({ userId: session.userId, userAccount: session.username, action: "UPDATE", resource: "SUB_REGION", resourceId: sub.id, resourceName: sub.name, detail: { id: sub.id, name: sub.name, slug: sub.slug, thumbnailChange, seoTitle: seoTitle ?? null, seoDescription: seoDescription ?? null, ogImageChange } });
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

  if (sub.thumbnailKey) await storage.delete(sub.thumbnailKey).catch(() => {});
  if (sub.ogImageKey) await storage.delete(sub.ogImageKey).catch(() => {});
  await db.subRegion.delete({ where: { id: subId } });
  void writeLog({ userId: session.userId, userAccount: session.username, action: "DELETE", resource: "SUB_REGION", resourceId: subId, resourceName: sub.name, detail: { id: subId, name: sub.name, hadThumbnail: !!sub.thumbnailKey } });
  return NextResponse.json({ ok: true });
}
