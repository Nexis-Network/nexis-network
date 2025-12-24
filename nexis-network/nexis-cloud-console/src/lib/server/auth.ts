import "server-only";

import type { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, PRIVY_COOKIE_NAME } from "@/lib/auth/constants";

function getCookieMaxAge() {
  const raw = process.env.NEXIS_CLOUD_SESSION_MAX_AGE;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isNaN(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 60 * 60 * 24 * 7;
}

export function setAuthCookie(response: NextResponse, apiKey: string) {
  response.cookies.set(AUTH_COOKIE_NAME, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getCookieMaxAge(),
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setPrivyAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(PRIVY_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getCookieMaxAge(),
  });
}

export function clearPrivyAuthCookie(response: NextResponse) {
  response.cookies.set(PRIVY_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
