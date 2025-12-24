import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { fetchApiUsageSummary } from "@/lib/server/service-metrics";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function GET(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const result = await fetchApiUsageSummary(apiKey);
  return NextResponse.json(result, { status: 200 });
}
