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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const fd = await req.formData();
  const parsed = schema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, slug } = parsed.data;

  const [nameConflict, slugConflict] = await Promise.all([
    db.region.findUnique({ where: { name } }),
    db.region.findUnique({ where: { slug } }),
  ]);
  if (nameConflict) return NextResponse.json({ error: "此名稱已存在" }, { status: 409 });
  if (slugConflict) return NextResponse.json({ error: "此 slug 已存在" }, { status: 409 });

  const max = await db.region.aggregate({ _max: { sortOrder: true } });
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

  const region = await db.region.create({
    data: { name, slug, sortOrder, thumbnail, thumbnailPublicId },
  });
  void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "REGION", resourceId: region.id, resourceName: region.name, detail: { id: region.id, name: region.name, slug: region.slug, thumbnail: thumbnail ?? null } });
  return NextResponse.json({ data: region }, { status: 201 });
}
