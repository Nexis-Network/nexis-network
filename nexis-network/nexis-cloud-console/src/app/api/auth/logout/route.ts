import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, clearPrivyAuthCookie } from "@/lib/server/auth";
import { requireCsrf } from "@/lib/server/csrf";

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookie(response);
  clearPrivyAuthCookie(response);
  return response;
}
