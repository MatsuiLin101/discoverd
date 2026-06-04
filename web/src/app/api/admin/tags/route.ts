import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";

const createSchema = z.object({
  name: z.string().min(1, { error: "請輸入標籤名稱" }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 403 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "請填寫標籤名稱" }, { status: 400 });
    }

    const { name } = result.data;

    const existing = await db.tag.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "此標籤名稱已存在" }, { status: 409 });
    }

    const tag = await db.tag.create({
      data: { name },
      select: { id: true, name: true },
    });

    void writeLog({ userId: session.userId, userEmail: session.email, action: "CREATE", resource: "TAG", resourceId: tag.id, resourceName: tag.name, detail: { id: tag.id, name: tag.name } });
    return NextResponse.json({ data: tag }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
