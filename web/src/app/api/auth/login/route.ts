import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "請填寫正確的帳號與密碼" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await db.user.findUnique({ where: { email } });

    // timing-safe: always run bcrypt even when user is not found
    const hash = user?.password ?? "$2b$12$invalidhashfortimingsafety00000";
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    await createSession(user.id, user.role);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
