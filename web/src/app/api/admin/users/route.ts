import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  username:    z.string().min(1, { error: "帳號不可為空" }),
  displayName: z.string().optional(),
  email:       z.string().email().optional(),
  password:    z.string().min(8, { error: "密碼至少 8 個字元" }),
  role:        z.enum(["ADMIN", "STAFF"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "請填寫正確的欄位資料" }, { status: 400 });
    }

    const { username, displayName, email, password, role } = result.data;

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "此帳號已被使用" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { username, displayName: displayName ?? null, email: email ?? null, password: hash, role },
      select: { id: true, username: true, displayName: true, email: true, role: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
