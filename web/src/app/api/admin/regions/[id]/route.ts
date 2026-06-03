import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/cloudinary";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
  sortOrder: z.coerce.number().int().default(0),
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
    sortOrder: fd.get("sortOrder"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug, sortOrder } = parsed.data;

  const existing = await db.region.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

  const [nameConflict, slugConflict] = await Promise.all([
    db.region.findFirst({ where: { name, id: { not: id } } }),
    db.region.findFirst({ where: { slug, id: { not: id } } }),
  ]);
  if (nameConflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });
  if (slugConflict) return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });

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

  const region = await db.region.update({
    where: { id },
    data: { name, slug, sortOrder, thumbnail, thumbnailPublicId },
  });
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
      include: { subRegions: { select: { thumbnailPublicId: true } } },
    });
    if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/regions/[id]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
