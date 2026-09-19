import { NextResponse } from "next/server";
import { getSocialLinks } from "@/lib/site-setting";

// Public social links for the frontend chrome. Reads from the cached site
// setting (revalidated when the admin saves social links) — no per-request DB
// write. Server-rendered pages pass these to the header directly; this route
// only backs the client fallback (see useSocialLinks).
export async function GET() {
  const data = await getSocialLinks();
  return NextResponse.json({ data });
}
