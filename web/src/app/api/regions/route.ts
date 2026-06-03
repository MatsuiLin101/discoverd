import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rows = await db.region.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        thumbnail: true,
        subRegions: {
          select: {
            _count: { select: { tours: { where: { published: true } } } },
          },
        },
      },
    });

    const result = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      thumbnail: r.thumbnail,
      tourCount: r.subRegions.reduce((sum, sr) => sum + sr._count.tours, 0),
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/regions]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
