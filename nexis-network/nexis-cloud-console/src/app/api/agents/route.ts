import { NextRequest, NextResponse } from "next/server";
import { proxyServiceRequest } from "@/lib/server/service-proxy";
import { listAgentConfigs } from "@/lib/server/agent-config";
import { getRequestIdentity } from "@/lib/server/identity";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

const baseUrl = process.env.NEXIS_AGENTS_API_URL;

const handler = async (request: NextRequest) =>
  proxyServiceRequest(request, {
    baseUrl,
    serviceName: "Agents",
  });

export async function GET(request: NextRequest) {
  const identity = await getRequestIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
    const configs = await listAgentConfigs({ apiKey, identity });
    return NextResponse.json({ items: configs }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load agents" },
      { status: 502 },
    );
  }
}

export { handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
