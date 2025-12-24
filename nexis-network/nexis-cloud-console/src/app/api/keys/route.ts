import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { requireCsrf } from "@/lib/server/csrf";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/server/api-keys-service";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const result = await listApiKeys(apiKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }
  return NextResponse.json({ items: result.data }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const result = await createApiKey(apiKey, label);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }
  return NextResponse.json(
    {
      key: result.data.key,
      secret: result.data.secret,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await revokeApiKey(apiKey, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }

  return NextResponse.json(
    {
      key: result.data.key,
    },
    { status: 200 }
  );
}
