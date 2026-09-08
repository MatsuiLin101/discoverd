import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const SINGLETON_ID = "singleton";

const schema = z.object({
  mobileHeroRatio: z.enum(["cover", "2/1", "4/3", "1/1"], "請選擇有效的手機輪播比例"),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { mobileHeroRatio } = parsed.data;

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, mobileHeroRatio },
    update: { mobileHeroRatio },
    select: { mobileHeroRatio: true },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "HERO_BANNER",
    resourceId: SINGLETON_ID,
    resourceName: "手機版輪播圖比例",
    detail: { mobileHeroRatio },
  });

  return NextResponse.json({ data: setting });
}
