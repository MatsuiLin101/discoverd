import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/cloudinary";

const createSchema = z.object({
  name: z.string().min(1, "請輸入行程名稱"),
  price: z.coerce.number().int().min(0, "價格不可為負數"),
  subRegionId: z.string().min(1, "請選擇次分類"),
  description: z
    .union([z.string().max(500), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const fd = await req.formData();
    const parsed = createSchema.safeParse({
      name: fd.get("name"),
      price: fd.get("price"),
      subRegionId: fd.get("subRegionId"),
      description: fd.get("description"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, price, subRegionId, description } = parsed.data;
    const tagIds = fd.getAll("tagIds") as string[];
    const published = fd.get("published") === "true";

    const subRegion = await db.subRegion.findUnique({ where: { id: subRegionId } });
    if (!subRegion) return NextResponse.json({ error: "找不到指定次分類" }, { status: 400 });

    let slug = randomBytes(4).toString("hex");
    for (let i = 0; i < 5; i++) {
      const conflict = await db.tour.findUnique({ where: { slug } });
      if (!conflict) break;
      slug = randomBytes(4).toString("hex");
    }

    let thumbnail: string | undefined;
    let thumbnailPublicId: string | undefined;
    const thumbFile = fd.get("thumbnail") as File | null;
    if (thumbFile && thumbFile.size > 0) {
      const buffer = Buffer.from(await thumbFile.arrayBuffer());
      const result = await uploadFile(buffer, { folder: "tours", mimeType: thumbFile.type });
      thumbnail = result.url;
      thumbnailPublicId = result.publicId;
    }

    const tour = await db.tour.create({
      data: {
        name,
        slug,
        price,
        description: description ?? null,
        subRegionId,
        published,
        thumbnail,
        thumbnailPublicId,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
    });

    const contentFiles = fd.getAll("contentFiles") as File[];
    for (let i = 0; i < contentFiles.length; i++) {
      const file = contentFiles[i];
      if (!file || file.size === 0) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, { folder: "tour-files", mimeType: file.type });
      await db.tourFile.create({
        data: {
          tourId: tour.id,
          url: result.url,
          publicId: result.publicId,
          mimeType: result.mimeType,
          filename: file.name,
          sortOrder: i,
        },
      });
    }

    return NextResponse.json({ data: { id: tour.id } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
