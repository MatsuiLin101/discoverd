import { NextResponse } from "next/server";
import { extendSession } from "@/lib/auth";

export async function POST() {
  const ok = await extendSession();
  if (!ok) {
    return NextResponse.json({ error: "session expired" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
