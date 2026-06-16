import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const createSchema = z.object({
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

type ContentFile = { key: string; filename: string; mimeType: string };

function parseContentFiles(raw: FormDataEntryValue | null): ContentFile[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ContentFile[]) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

    const fd = await req.formData();
    const rawSeoTitle = fd.get("seoTitle");
    const rawSeoDescription = fd.get("seoDescription");
    const parsed = createSchema.safeParse({
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

    const subRegion = await db.subRegion.findUnique({ where: { id: subRegionId } });
    if (!subRegion) return NextResponse.json({ error: "找不到指定次分類" }, { status: 400 });

    let slug = randomBytes(4).toString("hex");
    for (let i = 0; i < 5; i++) {
      const conflict = await db.tour.findUnique({ where: { slug } });
      if (!conflict) break;
      slug = randomBytes(4).toString("hex");
    }

    const thumbnailKey = (fd.get("thumbnailKey") as string) || null;
    const ogImageKey = (fd.get("ogImageKey") as string) || null;

    const tour = await db.tour.create({
      data: {
        name,
        slug,
        price,
        description: description ?? null,
        subRegionId,
        published,
        thumbnailKey,
        seoTitle,
        seoDescription,
        ogImageKey,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
    });

    const contentFiles = parseContentFiles(fd.get("contentFiles"));
    for (let i = 0; i < contentFiles.length; i++) {
      const file = contentFiles[i];
      if (!file?.key) continue;
      await db.tourFile.create({
        data: {
          tourId: tour.id,
          key: file.key,
          mimeType: file.mimeType,
          filename: file.filename,
          sortOrder: i,
        },
      });
    }

    void writeLog({ userId: session.userId, userAccount: session.username, action: "CREATE", resource: "TOUR", resourceId: tour.id, resourceName: tour.name, detail: { id: tour.id, name: tour.name, price, subRegionId, published, thumbnailKey: thumbnailKey ?? null, seoTitle: seoTitle ?? null, seoDescription: seoDescription ?? null, ogImageKey: ogImageKey ?? null } });
    return NextResponse.json({ data: { id: tour.id } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/tours]", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
