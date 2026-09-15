import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { storage } from "@/lib/storage";
import { writeLog } from "@/lib/log";
import { parseCropField } from "@/lib/crop";

/**
 * Delete a stored image, unless it is still referenced by an AI candidate
 * (AiGeneration.imageKey) for this tour — selecting a candidate as the
 * thumbnail shares its stored object, so we must not remove it here.
 */
async function deleteThumbIfUnreferenced(tourId: string, key: string): Promise<void> {
  const referenced = await db.aiGeneration.findFirst({
    where: { tourId, imageKey: key },
    select: { id: true },
  });
  if (!referenced) await storage.delete(key).catch(() => {});
}

/**
 * Flag the AI candidates that the saved tour actually adopted (thumbnail by
 * stored key, description by exact text), clearing the flag on the others.
 */
async function reconcileSelectedCandidates(
  tourId: string,
  thumbnailKey: string | null,
  description: string | null,
): Promise<void> {
  try {
    await db.aiGeneration.updateMany({ where: { tourId }, data: { isSelected: false } });
    if (thumbnailKey) {
      await db.aiGeneration.updateMany({
        where: { tourId, kind: "THUMBNAIL", imageKey: thumbnailKey },
        data: { isSelected: true },
      });
    }
    if (description) {
      await db.aiGeneration.updateMany({
        where: { tourId, kind: "DESCRIPTION", text: description },
        data: { isSelected: true },
      });
    }
  } catch (e) {
    console.error("[reconcileSelectedCandidates]", e);
  }
}

const updateSchema = z.object({
  name: z.string().min(1, "請輸入行程名稱"),
  price: z.coerce.number().int().min(0, "價格不可為負數"),
  subRegionId: z.string().min(1, "請選擇次分類"),
  description: z
    .union([z.string().max(500), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
  seoTitle: z.string().max(100).optional(),
  seoDescription: z.string().max(160).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id } = await params;
    const fd = await req.formData();
    const rawSeoTitle = fd.get("seoTitle");
    const rawSeoDescription = fd.get("seoDescription");
    const parsed = updateSchema.safeParse({
      name: fd.get("name"),
      price: fd.get("price"),
      subRegionId: fd.get("subRegionId"),
      description: fd.get("description"),
      seoTitle: typeof rawSeoTitle === "string" && rawSeoTitle ? rawSeoTitle : undefined,
      seoDescription: typeof rawSeoDescription === "string" && rawSeoDescription ? rawSeoDescription : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, price, subRegionId, description, seoTitle, seoDescription } = parsed.data;
    const tagIds = fd.getAll("tagIds") as string[];
    const published = fd.get("published") === "true";

    const existing = await db.tour.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    const subRegion = await db.subRegion.findUnique({ where: { id: subRegionId } });
    if (!subRegion) return NextResponse.json({ error: "找不到指定次分類" }, { status: 400 });

    let thumbnailKey: string | null = existing.thumbnailKey;
    const newThumbnailKey = (fd.get("thumbnailKey") as string) || null;
    const clearThumbnail = fd.get("clearThumbnail") === "true";

    if (clearThumbnail && !newThumbnailKey) {
      if (existing.thumbnailKey) await deleteThumbIfUnreferenced(id, existing.thumbnailKey);
      thumbnailKey = null;
    } else if (newThumbnailKey && newThumbnailKey !== existing.thumbnailKey) {
      if (existing.thumbnailKey) await deleteThumbIfUnreferenced(id, existing.thumbnailKey);
      thumbnailKey = newThumbnailKey;
    }

    // Crop always mirrors the client's current state for the surviving thumbnail;
    // when the thumbnail is cleared, the crop is dropped too.
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

    const tour = await db.tour.update({
      where: { id },
      data: {
        name,
        price,
        description: description ?? null,
        subRegionId,
        published,
        thumbnailKey,
        thumbnailCrop: thumbnailCrop ?? Prisma.DbNull,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        ogImageKey,
        tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
      },
    });
    // Record which AI candidates (if any) were adopted, so the usage log and
    // candidate list can show the chosen version. Matching is deterministic:
    // thumbnail by stored key, description by exact text.
    void reconcileSelectedCandidates(id, thumbnailKey, description ?? null);

    const thumbnailChange = clearThumbnail && !newThumbnailKey
      ? "removed"
      : newThumbnailKey
        ? existing.thumbnailKey ? "replaced" : "added"
        : "unchanged";
    const ogImageChange = clearOgImage && !newOgImageKey
      ? "removed"
      : newOgImageKey
        ? existing.ogImageKey ? "replaced" : "added"
        : "unchanged";
    void writeLog({ userId: session.userId, userAccount: session.username, action: "UPDATE", resource: "TOUR", resourceId: tour.id, resourceName: tour.name, detail: { id: tour.id, name: tour.name, price, subRegionId, published, thumbnailChange, seoTitle: seoTitle ?? null, seoDescription: seoDescription ?? null, ogImageChange } });
    return NextResponse.json({ data: tour });
  } catch (e) {
    console.error("[PUT /api/admin/tours/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const { id } = await params;
    const tour = await db.tour.findUnique({
      where: { id },
      include: {
        files: { select: { key: true } },
        aiGenerations: { where: { imageKey: { not: null } }, select: { imageKey: true } },
      },
    });
    if (!tour) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    // Collect every stored object to remove; a shared key (thumbnail selected
    // from a candidate) is de-duplicated so we don't delete it twice.
    const keys = new Set<string>();
    if (tour.thumbnailKey) keys.add(tour.thumbnailKey);
    if (tour.ogImageKey) keys.add(tour.ogImageKey);
    for (const file of tour.files) keys.add(file.key);
    for (const g of tour.aiGenerations) if (g.imageKey) keys.add(g.imageKey);
    await Promise.all([...keys].map((key) => storage.delete(key).catch(() => {})));

    await db.tour.delete({ where: { id } });
    void writeLog({ userId: session.userId, userAccount: session.username, action: "DELETE", resource: "TOUR", resourceId: id, resourceName: tour.name, detail: { id, name: tour.name, hadThumbnail: !!tour.thumbnailKey } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/tours/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
