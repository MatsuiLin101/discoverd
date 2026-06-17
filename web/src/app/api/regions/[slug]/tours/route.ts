import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { toTourMedia } from "@/lib/frontend-queries";

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
        subRegions: {
          orderBy: { sortOrder: "asc" },
          select: {
            slug: true,
            name: true,
            tours: {
              where: { published: true },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                slug: true,
                name: true,
                thumbnailKey: true,
                price: true,
                description: true,
                tags: { select: { name: true } },
                files: {
                  orderBy: { sortOrder: "asc" },
                  select: { key: true, mimeType: true, filename: true },
                },
              },
            },
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: "Region not found" }, { status: 404 });
    }

    const payload = {
      region: { slug: region.slug, name: region.name },
      subRegions: region.subRegions.map((sr) => ({
        slug: sr.slug,
        name: sr.name,
        tours: sr.tours.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          thumbnail: t.thumbnailKey ? storage.publicUrl(t.thumbnailKey) : null,
          price: t.price,
          description: t.description,
          tags: t.tags.map((tag) => tag.name),
          media: t.files.map(toTourMedia),
        })),
      })),
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error("[GET /api/regions/[slug]/tours]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
