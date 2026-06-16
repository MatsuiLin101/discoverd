import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

const urlOf = (key: string | null): string | null => (key ? storage.publicUrl(key) : null);

const ParamSchema = z.object({
  slug: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsed = ParamSchema.safeParse({ slug });
    if (!parsed.success) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }

    const region = await db.region.findUnique({
      where: { slug: parsed.data.slug },
      select: {
        slug: true,
        name: true,
        thumbnailKey: true,
        subRegions: {
          orderBy: { sortOrder: "asc" },
          select: {
            slug: true,
            name: true,
            thumbnailKey: true,
            _count: { select: { tours: { where: { published: true } } } },
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }

    const result = {
      slug: region.slug,
      name: region.name,
      thumbnail: urlOf(region.thumbnailKey),
      subRegions: region.subRegions.map((sr) => ({
        slug: sr.slug,
        name: sr.name,
        thumbnail: urlOf(sr.thumbnailKey),
        tourCount: sr._count.tours,
      })),
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/regions/[slug]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
