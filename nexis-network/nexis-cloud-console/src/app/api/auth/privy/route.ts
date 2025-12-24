import { NextRequest, NextResponse } from "next/server";
import { setPrivyAuthCookie, clearPrivyAuthCookie } from "@/lib/server/auth";
import { isPrivyConfigured, verifyPrivyAuthToken } from "@/lib/server/privy";
import { requireCsrf } from "@/lib/server/csrf";

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  if (!isPrivyConfigured()) {
    return NextResponse.json({ error: "Privy is not configured" }, { status: 501 });
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const body = await request.json().catch(() => ({}));
  const token = bearerToken || (body?.token as string | undefined);

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  try {
    const claims = await verifyPrivyAuthToken(token);
    const response = NextResponse.json({ session: claims }, { status: 200 });
    setPrivyAuthCookie(response, token);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid auth token" },
      { status: 401 },
    );
    clearPrivyAuthCookie(response);
    return response;
  }
}
