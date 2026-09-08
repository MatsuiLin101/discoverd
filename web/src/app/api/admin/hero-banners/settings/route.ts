import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const SINGLETON_ID = "singleton";

const schema = z.object({
  heroDisplayMode: z.enum(["original", "fit"], "請選擇有效的顯示方式"),
  heroMaxHeight: z.coerce.number().int("請輸入整數").min(200, "高度至少 200px").max(2000, "高度最多 2000px"),
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

  const { heroDisplayMode, heroMaxHeight, mobileHeroRatio } = parsed.data;
  const data = { heroDisplayMode, heroMaxHeight, mobileHeroRatio };

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
    select: { heroDisplayMode: true, heroMaxHeight: true, mobileHeroRatio: true },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "HERO_BANNER",
    resourceId: SINGLETON_ID,
    resourceName: "輪播圖顯示設定",
    detail: data,
  });

  return NextResponse.json({ data: setting });
}
