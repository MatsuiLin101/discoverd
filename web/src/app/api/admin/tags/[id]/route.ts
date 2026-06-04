import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";

const updateSchema = z.object({
  name: z.string().min(1, { error: "請輸入標籤名稱" }),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 403 });
    }

    const { id } = await params;

    const target = await db.tag.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "標籤不存在" }, { status: 404 });
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "請填寫標籤名稱" }, { status: 400 });
    }

    const { name } = result.data;

    if (name !== target.name) {
      const duplicate = await db.tag.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json({ error: "此標籤名稱已存在" }, { status: 409 });
      }
    }

    const tag = await db.tag.update({
      where: { id },
      data: { name },
      select: { id: true, name: true },
    });

    void writeLog({ userId: session.userId, userEmail: session.email, action: "UPDATE", resource: "TAG", resourceId: tag.id, resourceName: tag.name, detail: { id: tag.id, name: tag.name } });
    return NextResponse.json({ data: tag });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "請先登入" }, { status: 403 });
    }

    const { id } = await params;

    const target = await db.tag.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "標籤不存在" }, { status: 404 });
    }

    await db.tag.delete({ where: { id } });
    void writeLog({ userId: session.userId, userEmail: session.email, action: "DELETE", resource: "TAG", resourceId: id, resourceName: target.name, detail: { id, name: target.name } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
