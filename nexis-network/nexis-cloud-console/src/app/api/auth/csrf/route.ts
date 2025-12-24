import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCsrfToken, setCsrfCookie } from "@/lib/server/csrf";

export async function GET(request: NextRequest) {
  const token = getOrCreateCsrfToken(request);
  const response = NextResponse.json({ token }, { status: 200 });
  setCsrfCookie(response, token);
  response.headers.set("cache-control", "no-store");
  return response;
}
