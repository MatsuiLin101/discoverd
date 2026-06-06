import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

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

    let thumbnail: string | null = existing.thumbnail;
    let thumbnailPublicId: string | null = existing.thumbnailPublicId;
    const thumbFile = fd.get("thumbnail") as File | null;
    const clearThumbnail = fd.get("clearThumbnail") === "true";

    if (clearThumbnail && !(thumbFile && thumbFile.size > 0)) {
      if (existing.thumbnailPublicId) {
        await deleteFile(existing.thumbnailPublicId, "image").catch(() => {});
      }
      thumbnail = null;
      thumbnailPublicId = null;
    } else if (thumbFile && thumbFile.size > 0) {
      if (existing.thumbnailPublicId) {
        await deleteFile(existing.thumbnailPublicId, "image").catch(() => {});
      }
      const buffer = Buffer.from(await thumbFile.arrayBuffer());
      const result = await uploadFile(buffer, { folder: "tours", mimeType: thumbFile.type });
      thumbnail = result.url;
      thumbnailPublicId = result.publicId;
    }

    let ogImage: string | null = existing.ogImage;
    let ogImagePublicId: string | null = existing.ogImagePublicId;
    const ogFile = fd.get("ogImage") as File | null;
    const clearOgImage = fd.get("clearOgImage") === "true";

    if (clearOgImage && !(ogFile && ogFile.size > 0)) {
      if (existing.ogImagePublicId) {
        await deleteFile(existing.ogImagePublicId, "image").catch(() => {});
      }
      ogImage = null;
      ogImagePublicId = null;
    } else if (ogFile && ogFile.size > 0) {
      if (existing.ogImagePublicId) {
        await deleteFile(existing.ogImagePublicId, "image").catch(() => {});
      }
      const buffer = Buffer.from(await ogFile.arrayBuffer());
      const result = await uploadFile(buffer, { folder: "seo-og/tours", mimeType: ogFile.type });
      ogImage = result.url;
      ogImagePublicId = result.publicId;
    }

    const tour = await db.tour.update({
      where: { id },
      data: {
        name,
        price,
        description: description ?? null,
        subRegionId,
        published,
        thumbnail,
        thumbnailPublicId,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        ogImage,
        ogImagePublicId,
        tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
      },
    });
    const thumbnailChange = clearThumbnail && !(thumbFile && thumbFile.size > 0)
      ? "removed"
      : thumbFile && thumbFile.size > 0
        ? existing.thumbnailPublicId ? "replaced" : "added"
        : "unchanged";
    const ogImageChange = clearOgImage && !(ogFile && ogFile.size > 0)
      ? "removed"
      : ogFile && ogFile.size > 0
        ? existing.ogImagePublicId ? "replaced" : "added"
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
      include: { files: { select: { publicId: true, mimeType: true } } },
    });
    if (!tour) return NextResponse.json({ error: "找不到此旅遊方案" }, { status: 404 });

    const deleteJobs: Promise<unknown>[] = [];
    if (tour.thumbnailPublicId) {
      deleteJobs.push(deleteFile(tour.thumbnailPublicId, "image").catch(() => {}));
    }
    if (tour.ogImagePublicId) {
      deleteJobs.push(deleteFile(tour.ogImagePublicId, "image").catch(() => {}));
    }
    for (const file of tour.files) {
      const resourceType = file.mimeType === "application/pdf" ? "raw" : "image";
      deleteJobs.push(deleteFile(file.publicId, resourceType).catch(() => {}));
    }
    await Promise.all(deleteJobs);

    await db.tour.delete({ where: { id } });
    void writeLog({ userId: session.userId, userAccount: session.username, action: "DELETE", resource: "TOUR", resourceId: id, resourceName: tour.name, detail: { id, name: tour.name, hadThumbnail: !!tour.thumbnailPublicId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/tours/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
