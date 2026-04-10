import { NextResponse } from "next/server";


/** @deprecated — Use /api/health instead. Will be removed in a future release. */
export function GET() {
  return NextResponse.redirect(new URL("/api/health", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), 308);
}
