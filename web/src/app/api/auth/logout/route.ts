import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

export async function POST() {
  const session = await getSession();
  if (session) {
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    if (user) {
      void writeLog({ userId: session.userId, userEmail: user.email, action: "LOGOUT", resource: "AUTH", resourceId: session.userId, resourceName: user.email });
    }
  }
  await deleteSession();
  return NextResponse.json({ ok: true });
}
