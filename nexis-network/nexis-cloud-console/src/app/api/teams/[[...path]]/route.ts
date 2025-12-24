import { NextRequest } from "next/server";
import { proxyServiceRequest } from "@/lib/server/service-proxy";

const baseUrl = process.env.NEXIS_TEAMS_API_URL;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const handler = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params;
  return proxyServiceRequest(request, {
    baseUrl,
    serviceName: "Teams",
    pathSegments: params.path,
  });
};

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
