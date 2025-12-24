import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie, clearAuthCookie } from "@/lib/server/auth";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { requireCsrf } from "@/lib/server/csrf";

type DeviceTokenSuccess = {
  access_token?: string;
  token_type?: string;
};

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const deviceCode = body?.device_code as string | undefined;

  if (!deviceCode) {
    return NextResponse.json({ error: "device_code is required" }, { status: 400 });
  }

  const tokenResult = await nexisFetch("/auth/device/token", {
    method: "POST",
    body: {
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    },
  });

  if (!tokenResult.ok) {
    return NextResponse.json(tokenResult.data, { status: tokenResult.status });
  }

  const tokenPayload = tokenResult.data as DeviceTokenSuccess;
  const accessToken = tokenPayload?.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 502 });
  }

  const userResult = await nexisFetch("/auth/me", {
    apiKey: accessToken,
  });

  if (!userResult.ok) {
    const response = NextResponse.json(
      {
        error: "Token validation failed",
        detail: userResult.data,
      },
      { status: userResult.status || 401 },
    );
    clearAuthCookie(response);
    return response;
  }

  const response = NextResponse.json({ user: userResult.data }, { status: 200 });
  setAuthCookie(response, accessToken);
  return response;
}
