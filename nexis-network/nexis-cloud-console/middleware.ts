import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, PRIVY_COOKIE_NAME } from "@/lib/auth/constants";

export function middleware(request: NextRequest) {
  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const privyToken = request.cookies.get(PRIVY_COOKIE_NAME)?.value;
  const privyEnabled = Boolean(process.env.PRIVY_APP_ID);

  const isAuthenticated = privyEnabled ? Boolean(privyToken) : Boolean(apiKey || privyToken);

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/dashboard") {
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
