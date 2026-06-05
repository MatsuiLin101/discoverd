import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/cloudinary";
import { writeLog } from "@/lib/log";

const schema = z.object({
  title: z.string().min(1, "標題不可為空"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const fd = await req.formData();
  const parsed = schema.safeParse({ title: fd.get("title") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title } = parsed.data;

  const file = fd.get("image") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "請上傳圖片" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFile(buffer, { folder: "hero-banners", mimeType: file.type });

  const max = await db.heroBanner.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const banner = await db.heroBanner.create({
    data: { title, image: result.url, imagePublicId: result.publicId, sortOrder },
  });
  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "CREATE",
    resource: "HERO_BANNER",
    resourceId: banner.id,
    resourceName: banner.title,
    detail: { id: banner.id, title: banner.title, image: banner.image },
  });
  return NextResponse.json({ data: banner }, { status: 201 });
}
