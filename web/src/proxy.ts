import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session_token")?.value;

  if (pathname === "/admin/login") {
    if (!token) return NextResponse.next();
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL("/admin", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
    response.cookies.delete("session_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
