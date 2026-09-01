import { NextRequest, NextResponse } from "next/server";
import { getTourModalData } from "@/lib/frontend-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    const { idOrSlug } = await params;
    const id = idOrSlug?.trim();
    if (!id) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    const tour = await getTourModalData(id);
    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    return NextResponse.json(tour);
  } catch (e) {
    console.error("[GET /api/tours/[idOrSlug]]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
