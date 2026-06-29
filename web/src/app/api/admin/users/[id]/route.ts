import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  username:    z.string().min(1, { error: "帳號不可為空" }),
  displayName: z.string().min(1, { error: "顯示名稱不可為空" }),
  email:       z.string().email().optional(),
  role:        z.enum(["ADMIN", "STAFF"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "請填寫正確的欄位資料" }, { status: 400 });
    }

    const { username, displayName, email, role } = result.data;

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
    }

    // Prevent demoting the last ADMIN
    if (target.role === "ADMIN" && role === "STAFF") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "無法降級：系統至少需要一位管理員" },
          { status: 403 }
        );
      }
    }

    // Check username uniqueness if changed
    if (username !== target.username) {
      const existing = await db.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ error: "此帳號已被使用" }, { status: 409 });
      }
    }

    // Check displayName uniqueness if changed
    if (displayName !== target.displayName) {
      const dupName = await db.user.findFirst({ where: { displayName } });
      if (dupName) {
        return NextResponse.json({ error: "此顯示名稱已被使用" }, { status: 409 });
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: { username, displayName, email: email ?? null, role },
      select: { id: true, username: true, displayName: true, email: true, role: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "帳號或顯示名稱已被使用" }, { status: 409 });
    }
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id } = await params;

    if (session.userId === id) {
      return NextResponse.json({ error: "不可刪除自己的帳號" }, { status: 403 });
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "無法刪除：系統至少需要一位管理員" },
          { status: 403 }
        );
      }
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
