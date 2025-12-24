import { NextRequest } from "next/server";
import { proxyServiceRequest } from "@/lib/server/service-proxy";
import { getNexisApiBaseUrl, getNexisApiVersion } from "@/lib/server/nexis-cloud";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const handler = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params;
  const baseUrl = getNexisApiBaseUrl().replace(/\/$/, "");
  return proxyServiceRequest(request, {
    baseUrl: `${baseUrl}/cvms`,
    serviceName: "Nexis Cloud",
    pathSegments: params.path,
    headers: {
      "X-Phala-Version": getNexisApiVersion(),
    },
  });
};

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
