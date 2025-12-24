import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, PRIVY_COOKIE_NAME } from "@/lib/auth/constants";
import { clearAuthCookie, clearPrivyAuthCookie } from "@/lib/server/auth";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { isPrivyConfigured, verifyPrivyAuthToken } from "@/lib/server/privy";

export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const privyToken = request.cookies.get(PRIVY_COOKIE_NAME)?.value;
  const privyConfigured = isPrivyConfigured();
  let apiKeyValid = false;
  let apiKeyUser: unknown = null;

  if (apiKey) {
    const userResult = await nexisFetch("/auth/me", { apiKey });
    if (userResult.ok) {
      apiKeyValid = true;
      apiKeyUser = userResult.data;
    } else {
      const response = NextResponse.json(
        {
          error: "Session expired",
          detail: userResult.data,
          hasApiKey: false,
        },
        { status: userResult.status || 401 },
      );
      clearAuthCookie(response);
      if (!privyToken || !privyConfigured) {
        return response;
      }
    }
  }

  if (privyConfigured) {
    if (!privyToken) {
      return NextResponse.json(
        { error: "Not authenticated", hasApiKey: apiKeyValid },
        { status: 401 },
      );
    }

    try {
      const claims = await verifyPrivyAuthToken(privyToken);
      return NextResponse.json(
        {
          session: claims,
          hasApiKey: apiKeyValid,
          authMethod: "privy",
        },
        { status: 200 },
      );
    } catch (error) {
      const response = NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Invalid auth token",
          hasApiKey: apiKeyValid,
        },
        { status: 401 },
      );
      clearPrivyAuthCookie(response);
      return response;
    }
  }

  if (apiKeyValid) {
    return NextResponse.json(
      { user: apiKeyUser, hasApiKey: true, authMethod: "api-key" },
      { status: 200 },
    );
  }

  return NextResponse.json({ error: "Not authenticated", hasApiKey: false }, { status: 401 });
}
