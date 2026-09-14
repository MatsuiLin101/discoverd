import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeGeneration } from "@/lib/ai/serialize";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const { id } = await params;
  const kind = req.nextUrl.searchParams.get("kind");
  const where: Prisma.AiGenerationWhereInput =
    kind === "DESCRIPTION" || kind === "THUMBNAIL"
      ? { tourId: id, kind }
      : { tourId: id };

  const rows = await db.aiGeneration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: rows.map(serializeGeneration) });
}
