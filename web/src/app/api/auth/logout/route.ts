import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";

export async function POST() {
  const session = await getSession();
  if (session) {
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { username: true } });
    if (user) {
      void writeLog({ userId: session.userId, userAccount: user.username, action: "LOGOUT", resource: "AUTH", resourceId: session.userId, resourceName: user.username });
    }
  }
  await deleteSession();
  return NextResponse.json({ ok: true });
}
