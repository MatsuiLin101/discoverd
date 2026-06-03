import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const rows = await db.tour.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
          { subRegion: { name: { contains: q, mode: "insensitive" } } },
          { subRegion: { region: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        price: true,
        tags: { select: { name: true } },
        subRegion: {
          select: {
            slug: true,
            region: { select: { slug: true, name: true } },
          },
        },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    const result = rows.map((t) => ({
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      price: t.price,
      tags: t.tags.map((tag) => tag.name),
      regionName: t.subRegion.region.name,
      regionSlug: t.subRegion.region.slug,
      subRegionSlug: t.subRegion.slug,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/search]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
