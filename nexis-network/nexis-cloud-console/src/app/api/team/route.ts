import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/server/identity";
import { proxyServiceRequest } from "@/lib/server/service-proxy";
import { buildTeamsProxyConfig } from "@/lib/server/teams-service";

export async function GET(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return proxyServiceRequest(request, buildTeamsProxyConfig([], identity));
}
