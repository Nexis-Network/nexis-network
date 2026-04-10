import { logger } from '@/lib/logger';

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type ExchangeRequest = {
  code?: UntypedJson;
};

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function resolveEnv(key: string) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(req: Request) {
  let payload: ExchangeRequest;
  try {
    payload = (await req.json()) as ExchangeRequest;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const code = typeof payload.code === "string" && payload.code.trim().length > 0 ? payload.code.trim() : null;
  if (!code) {
    return Response.json({ error: "Authorization code is required" }, { status: 400 });
  }

  const clientId =
    resolveEnv("NEX_AUTH_GOOGLE_CLIENT_ID") ??
    resolveEnv("GOOGLE_CLIENT_ID") ??
    resolveEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  const clientSecret = resolveEnv("NEX_AUTH_GOOGLE_SECRET") ?? resolveEnv("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return Response.json({ error: "Google OAuth is not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: "postmessage",
    grant_type: "authorization_code",
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      cache: "no-store",
    });
  } catch (error) {
    logger.error("google_token_exchange_failed", error);
    return Response.json({ error: "Google token exchange failed" }, { status: 502 });
  }

  let data: GoogleTokenResponse;
  try {
    data = (await tokenResponse.json()) as GoogleTokenResponse;
  } catch {
    data = {};
  }

  if (!tokenResponse.ok) {
    const message = data.error_description || data.error || "Google token exchange failed";
    return Response.json({ error: message }, { status: 400 });
  }

  if (!data.id_token) {
    return Response.json({ error: "Google response missing ID token" }, { status: 400 });
  }

  return Response.json(
    {
      id_token: data.id_token,
      access_token: data.access_token ?? null,
      refresh_token: data.refresh_token ?? null,
      expires_in: data.expires_in ?? null,
      scope: data.scope ?? null,
      token_type: data.token_type ?? null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
