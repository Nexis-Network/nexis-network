import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, setAuthCookie } from "@/lib/server/auth";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { requireCsrf } from "@/lib/server/csrf";

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const apiKey = body?.apiKey as string | undefined;

  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  const userResult = await nexisFetch("/auth/me", { apiKey });

  if (!userResult.ok) {
    const response = NextResponse.json(
      {
        error: "Invalid API key",
        detail: userResult.data,
      },
      { status: userResult.status || 401 },
    );
    clearAuthCookie(response);
    return response;
  }

  const response = NextResponse.json({ user: userResult.data }, { status: 200 });
  setAuthCookie(response, apiKey);
  return response;
}
