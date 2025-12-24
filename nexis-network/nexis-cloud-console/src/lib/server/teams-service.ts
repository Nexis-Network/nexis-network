import "server-only";

import type { ServiceProxyConfig } from "@/lib/server/service-proxy";
import type { RequestIdentity } from "@/lib/server/identity";
import { buildIdentityHeaders } from "@/lib/server/service-auth";

function needsTeamPrefix(baseUrl: string | undefined) {
  if (!baseUrl) return true;
  const normalized = baseUrl.replace(/\/$/, "");
  return !/\/teams?$/.test(normalized);
}

export function buildTeamsProxyConfig(
  pathSegments: string[],
  identity?: RequestIdentity | null,
): ServiceProxyConfig {
  const baseUrl = process.env.NEXIS_TEAMS_API_URL;
  const segments = needsTeamPrefix(baseUrl) ? ["team", ...pathSegments] : pathSegments;
  return {
    baseUrl,
    serviceName: "Teams",
    pathSegments: segments,
    headers: buildIdentityHeaders(identity),
  };
}
