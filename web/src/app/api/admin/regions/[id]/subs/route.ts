import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只允許小寫英數字和連字號"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const { id: regionId } = await params;
  const region = await db.region.findUnique({ where: { id: regionId } });
  if (!region) return NextResponse.json({ error: "找不到此地區" }, { status: 404 });

  const fd = await req.formData();
  const parsed = schema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug } = parsed.data;

  const slugConflict = await db.subRegion.findFirst({ where: { regionId, slug } });
  if (slugConflict) return NextResponse.json({ error: "此 slug 在此主分類下已存在" }, { status: 409 });

  const max = await db.subRegion.aggregate({
    where: { regionId },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  let thumbnail: string | undefined;
  let thumbnailPublicId: string | undefined;
  const file = fd.get("thumbnail") as File | null;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder: "regions", mimeType: file.type });
    thumbnail = result.url;
    thumbnailPublicId = result.publicId;
  }

  const sub = await db.subRegion.create({
    data: { regionId, name, slug, sortOrder, thumbnail, thumbnailPublicId },
  });
  void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "SUB_REGION", resourceId: sub.id, resourceName: sub.name, detail: { id: sub.id, name: sub.name, slug: sub.slug, parentRegion: region.name, thumbnail: thumbnail ?? null } });
  return NextResponse.json({ data: sub }, { status: 201 });
}
