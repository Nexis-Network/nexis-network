import { extractClientIP } from "@/lib/request-utils";
import { authenticatePublicApiKey } from "@/server/security/public-api-key-auth";

import {
  publicErrorResponse,
  publicJsonResponse,
} from "@/app/api/v1/_shared/public-api-response";

export async function GET(request: Request) {
  const auth = await authenticatePublicApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requestIp: extractClientIP(request),
  });

  if (!auth.ok) {
    return publicErrorResponse({
      code: auth.code,
      message: auth.message,
      status: auth.status,
    });
  }

  return publicJsonResponse({
    projectId: auth.context.projectId,
    plan: auth.context.billingAccount?.plan ?? "launch",
    includedCredits: auth.context.billingAccount?.includedCredits ?? 0,
    usage: auth.context.usageSnapshot,
    quotas: auth.context.quotas,
  });
}
