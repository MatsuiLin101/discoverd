import { NextRequest, NextResponse } from "next/server";
import { searchTours } from "@/lib/frontend-queries";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const q = sp.get("q")?.trim() ?? "";
  const region = sp.get("region")?.trim() || undefined;
  const sub = sp.get("sub")?.trim() || undefined;
  // Tags may arrive as repeated params (?tags=a&tags=b) or comma-joined.
  const tags = sp
    .getAll("tags")
    .flatMap((v) => v.split(","))
    .map((t) => t.trim())
    .filter(Boolean);

  const limitRaw = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 8;

  try {
    const data = await searchTours({ q, region, sub, tags }, limit);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/search]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
