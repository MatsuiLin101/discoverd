import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAdminPath } from "@/lib/admin-path";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPath = getAdminPath();

  // Block direct access to the physical /admin route so the admin panel is
  // only reachable through the secret prefix. Skipped when the prefix is the
  // default /admin (dev / unconfigured).
  if (
    adminPath !== "/admin" &&
    (pathname === "/admin" || pathname.startsWith("/admin/"))
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Only the secret admin prefix is handled here; everything else passes through.
  const isAdminRequest =
    pathname === adminPath || pathname.startsWith(`${adminPath}/`);
  if (!isAdminRequest) return NextResponse.next();

  const loginPath = `${adminPath}/login`;

  // Map the secret prefix back to the physical /admin route.
  function rewriteToPhysical() {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname.slice(adminPath.length)}`;
    return NextResponse.rewrite(url);
  }

  // Login page is always reachable; the page itself handles the session check.
  if (pathname === loginPath) return rewriteToPhysical();

  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return rewriteToPhysical();
  } catch {
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    response.cookies.delete("session_token");
    return response;
  }
}

export const config = {
  // matcher must be a static constant, so it cannot reference ADMIN_PATH.
  // Run on every page request (excluding Next internals, API routes, and
  // files with an extension); the admin-prefix check happens in the handler.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
