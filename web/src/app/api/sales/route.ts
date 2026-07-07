import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

// Public endpoint powering the footer "業務團隊" modal: regions in display order,
// each with its business cards. Regions with no cards are omitted.
export async function GET() {
  const regions = await db.salesRegion.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      agents: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, cardKey: true, mimeType: true, filename: true },
      },
    },
  });

  const data = regions
    .map((r) => ({
      id: r.id,
      name: r.name,
      cards: r.agents.map((a) => ({
        id: a.id,
        url: storage.publicUrl(a.cardKey),
        mimeType: a.mimeType,
        filename: a.filename,
      })),
    }))
    .filter((r) => r.cards.length > 0);

  return NextResponse.json({ data });
}
