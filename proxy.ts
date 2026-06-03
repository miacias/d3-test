import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "private_auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /private/* routes
  if (pathname.startsWith("/private")) {
    const authCookie = request.cookies.get(COOKIE_NAME);
    const secret = process.env.PRIVATE_ROUTE_SECRET;

    if (!secret || authCookie?.value !== secret) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/private/:path*"],
};