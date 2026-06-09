import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const setting = await db.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    select: { facebookUrl: true, instagramUrl: true, lineUrl: true },
  });

  return NextResponse.json({ data: setting });
}
