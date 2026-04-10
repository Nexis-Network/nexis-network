import { NextResponse } from "next/server";

import { POST as issueCdpToken } from "@/app/api/auth/cdp/token/route";

type TokenRouteEnvelope = {
  success?: boolean;
  data?: {
    token?: string;
  };
  error?: {
    message?: string;
  };
};

async function buildCompatResponse(request: Request): Promise<NextResponse> {
  const response = await issueCdpToken(request);
  if (!response.ok) {
    return response;
  }

  const body = (await response.json()) as TokenRouteEnvelope;
  const token = body.data?.token;
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "CDP token response missing token",
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        token,
        jwt: token,
      },
    },
    {
      status: response.status,
      headers: {
        "Cache-Control": response.headers.get("Cache-Control") ?? "private, no-store",
      },
    },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  return buildCompatResponse(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
    }),
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  return buildCompatResponse(request);
}
