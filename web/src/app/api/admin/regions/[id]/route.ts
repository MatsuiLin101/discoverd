import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";
import { parseCropField } from "@/lib/crop";
import { Prisma } from "@/generated/prisma/client";

const schema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
  seoTitle: z.string().max(100).optional(),
  seoDescription: z.string().max(160).optional(),
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

  const existing = await db.region.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

  const [nameConflict, slugConflict] = await Promise.all([
    db.region.findFirst({ where: { name, id: { not: id } } }),
    db.region.findFirst({ where: { slug, id: { not: id } } }),
  ]);
  if (nameConflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });
  if (slugConflict) return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });

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

  const region = await db.region.update({
    where: { id },
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
  void writeLog({ userId: session.userId, userAccount: session.username, action: "UPDATE", resource: "REGION", resourceId: region.id, resourceName: region.name, detail: { id: region.id, name: region.name, slug: region.slug, thumbnailChange, seoTitle: seoTitle ?? null, seoDescription: seoDescription ?? null, ogImageChange } });
  return NextResponse.json({ data: region });
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
    const region = await db.region.findUnique({
      where: { id },
      include: {
        subRegions: {
          select: { id: true, name: true, thumbnailKey: true, ogImageKey: true, _count: { select: { tours: true } } },
        },
      },
    });
    if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

    const tourTotal = region.subRegions.reduce((sum, s) => sum + s._count.tours, 0);
    if (tourTotal > 0) {
      return NextResponse.json({ error: "此主分類下還有旅遊方案，無法刪除" }, { status: 409 });
    }

    const deleteJobs: Promise<unknown>[] = [];
    if (region.thumbnailKey) deleteJobs.push(storage.delete(region.thumbnailKey).catch(() => {}));
    if (region.ogImageKey) deleteJobs.push(storage.delete(region.ogImageKey).catch(() => {}));
    for (const sub of region.subRegions) {
      if (sub.thumbnailKey) deleteJobs.push(storage.delete(sub.thumbnailKey).catch(() => {}));
      if (sub.ogImageKey) deleteJobs.push(storage.delete(sub.ogImageKey).catch(() => {}));
    }
    await Promise.all(deleteJobs);

    await db.region.delete({ where: { id } });

    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "DELETE",
      resource: "REGION",
      resourceId: id,
      resourceName: region.name,
      detail: {
        id,
        name: region.name,
        hadThumbnail: !!region.thumbnailKey,
        cascadeDeletedSubRegions: region.subRegions.map((s) => ({ id: s.id, name: s.name, hadThumbnail: !!s.thumbnailKey })),
      },
    });
    for (const sub of region.subRegions) {
      void writeLog({
        userId: session.userId,
        userAccount: session.username,
        action: "DELETE",
        resource: "SUB_REGION",
        resourceId: sub.id,
        resourceName: sub.name,
        detail: { id: sub.id, name: sub.name, cascadeFrom: region.name },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/regions/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
