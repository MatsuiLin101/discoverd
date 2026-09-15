import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const SINGLETON_ID = "singleton";

const schema = z.object({
  layoutMode: z.enum(["original", "fit", "boxed"], "請選擇有效的版面模式"),
  heroPauseOnHover: z.boolean(),
  heroMaxHeight: z.coerce.number().int("請輸入整數").min(200, "高度至少 200px").max(2000, "高度最多 2000px"),
  heroRatio: z.enum(["auto", "2/1", "16/9", "3/2", "4/3", "1/1"], "請選擇有效的輪播圖比例"),
  boxMaxWidth: z.coerce.number().int("請輸入整數").min(768, "盒寬至少 768px").max(2560, "盒寬最多 2560px"),
  boxOuterBackground: z.enum(["neutral", "gradient", "dark"], "請選擇有效的盒外背景"),
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

  const {
    layoutMode,
    heroPauseOnHover,
    heroMaxHeight,
    heroRatio,
    boxMaxWidth,
    boxOuterBackground,
    mobileHeroRatio,
  } = parsed.data;
  const data = {
    layoutMode,
    heroPauseOnHover,
    heroMaxHeight,
    heroRatio,
    boxMaxWidth,
    boxOuterBackground,
    mobileHeroRatio,
  };

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
    select: {
      layoutMode: true,
      heroPauseOnHover: true,
      heroMaxHeight: true,
      heroRatio: true,
      boxMaxWidth: true,
      boxOuterBackground: true,
      mobileHeroRatio: true,
    },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "HERO_BANNER",
    resourceId: SINGLETON_ID,
    resourceName: "全站版面設定",
    detail: data,
  });

  return NextResponse.json({ data: setting });
}
