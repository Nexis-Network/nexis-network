import { NextRequest, NextResponse } from "next/server";
import { nexisFetch } from "@/lib/server/nexis-cloud";
import { requireCsrf } from "@/lib/server/csrf";

export async function POST(request: NextRequest) {
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const clientId =
    (body?.client_id as string | undefined) ||
    process.env.NEXIS_CLOUD_DEVICE_CLIENT_ID ||
    "phala-cli";
  const scope =
    (body?.scope as string | undefined) ||
    process.env.NEXIS_CLOUD_DEVICE_SCOPE ||
    "user:profile cvms:* nodes:*";

  const result = await nexisFetch("/auth/device/code", {
    method: "POST",
    body: { client_id: clientId, scope },
  });

  return NextResponse.json(result.data, { status: result.status });
}
