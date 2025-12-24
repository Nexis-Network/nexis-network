import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/auth/constants";

const DEFAULT_CSRF_MAX_AGE = 60 * 60 * 4; // 4 hours

function generateToken() {
  return crypto.randomUUID();
}

export function getOrCreateCsrfToken(request?: NextRequest) {
  return request?.cookies.get(CSRF_COOKIE_NAME)?.value || generateToken();
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEFAULT_CSRF_MAX_AGE,
  });
}

export function requireCsrf(request: NextRequest) {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null;
}
