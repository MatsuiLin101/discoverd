import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

const schema = z.object({
  facebookUrl: z.string().url("請輸入有效的 Facebook 網址").or(z.literal("")).optional(),
  instagramUrl: z.string().url("請輸入有效的 Instagram 網址").or(z.literal("")).optional(),
  lineUrl: z.string().url("請輸入有效的 LINE 網址").or(z.literal("")).optional(),
});

const SINGLETON_ID = "singleton";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
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
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { facebookUrl, instagramUrl, lineUrl } = parsed.data;

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      lineUrl: lineUrl || null,
    },
    update: {
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      lineUrl: lineUrl || null,
    },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "SITE_SETTING",
    resourceId: SINGLETON_ID,
    resourceName: "社群媒體連結",
    detail: { facebookUrl, instagramUrl, lineUrl },
  });

  return NextResponse.json({ data: setting });
}
