import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
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
  const parsed = schema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug } = parsed.data;

  const existing = await db.region.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

  const [nameConflict, slugConflict] = await Promise.all([
    db.region.findFirst({ where: { name, id: { not: id } } }),
    db.region.findFirst({ where: { slug, id: { not: id } } }),
  ]);
  if (nameConflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });
  if (slugConflict) return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });

  let thumbnail: string | null = existing.thumbnail;
  let thumbnailPublicId: string | null = existing.thumbnailPublicId;

  const file = fd.get("thumbnail") as File | null;
  const clearThumbnail = fd.get("clearThumbnail") === "true";

  if (clearThumbnail && !(file && file.size > 0)) {
    if (existing.thumbnailPublicId) {
      await deleteFile(existing.thumbnailPublicId, "image").catch(() => {});
    }
    thumbnail = null;
    thumbnailPublicId = null;
  } else if (file && file.size > 0) {
    if (existing.thumbnailPublicId) {
      await deleteFile(existing.thumbnailPublicId, "image").catch(() => {});
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder: "regions", mimeType: file.type });
    thumbnail = result.url;
    thumbnailPublicId = result.publicId;
  }

  const region = await db.region.update({
    where: { id },
    data: { name, slug, thumbnail, thumbnailPublicId },
  });
  const thumbnailChange = clearThumbnail && !(file && file.size > 0)
    ? "removed"
    : (file && file.size > 0)
      ? (existing.thumbnailPublicId ? "replaced" : "added")
      : "unchanged";
  void writeLog({ userId: session.userId, userAccount: session.username, action: "UPDATE", resource: "REGION", resourceId: region.id, resourceName: region.name, detail: { id: region.id, name: region.name, slug: region.slug, thumbnailChange } });
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
          select: { id: true, name: true, thumbnailPublicId: true, _count: { select: { tours: true } } },
        },
      },
    });
    if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

    const tourTotal = region.subRegions.reduce((sum, s) => sum + s._count.tours, 0);
    if (tourTotal > 0) {
      return NextResponse.json({ error: "此主分類下還有旅遊方案，無法刪除" }, { status: 409 });
    }

    const deleteJobs: Promise<unknown>[] = [];
    if (region.thumbnailPublicId) {
      deleteJobs.push(deleteFile(region.thumbnailPublicId, "image").catch(() => {}));
    }
    for (const sub of region.subRegions) {
      if (sub.thumbnailPublicId) {
        deleteJobs.push(deleteFile(sub.thumbnailPublicId, "image").catch(() => {}));
      }
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
        hadThumbnail: !!region.thumbnailPublicId,
        cascadeDeletedSubRegions: region.subRegions.map((s) => ({ id: s.id, name: s.name, hadThumbnail: !!s.thumbnailPublicId })),
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
