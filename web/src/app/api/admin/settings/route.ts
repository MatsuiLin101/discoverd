import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const schema = z.object({
  facebookUrl: z.string().url("請輸入有效的 Facebook 網址").or(z.literal("")).optional(),
  instagramUrl: z.string().url("請輸入有效的 Instagram 網址").or(z.literal("")).optional(),
  lineUrl: z.string().url("請輸入有效的 LINE 網址").or(z.literal("")).optional(),
  lineCommunityUrl: z.string().url("請輸入有效的 LINE 社群網址").or(z.literal("")).optional(),
  mobileHeroRatio: z.enum(["cover", "2/1", "4/3", "1/1"], "請選擇有效的手機輪播比例").optional(),
});

const SINGLETON_ID = "singleton";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });

  return NextResponse.json({ data: setting });
}

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

  const { facebookUrl, instagramUrl, lineUrl, lineCommunityUrl, mobileHeroRatio } = parsed.data;

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      lineUrl: lineUrl || null,
      lineCommunityUrl: lineCommunityUrl || null,
      ...(mobileHeroRatio ? { mobileHeroRatio } : {}),
    },
    update: {
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      lineUrl: lineUrl || null,
      lineCommunityUrl: lineCommunityUrl || null,
      ...(mobileHeroRatio ? { mobileHeroRatio } : {}),
    },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "SITE_SETTING",
    resourceId: SINGLETON_ID,
    resourceName: "網站設定",
    detail: { facebookUrl, instagramUrl, lineUrl, lineCommunityUrl, mobileHeroRatio },
  });

  return NextResponse.json({ data: setting });
}
