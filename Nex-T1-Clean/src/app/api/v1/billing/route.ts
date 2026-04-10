import { extractClientIP } from "@/lib/request-utils";
import { authenticatePublicApiKey } from "@/server/security/public-api-key-auth";
import { getDeveloperBillingPlan } from "@/server/services/developer-api/plan-registry";

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

  const billingPlan = getDeveloperBillingPlan(auth.context.billingAccount?.plan);
  const includedCredits = auth.context.billingAccount?.includedCredits ?? billingPlan.includedCredits;
  const monthlyCreditsUsed = auth.context.usageSnapshot.monthlyCreditsUsed;
  const overageCredits = Math.max(monthlyCreditsUsed - includedCredits, 0);

  return publicJsonResponse({
    projectId: auth.context.projectId,
    plan: billingPlan,
    includedCredits,
    monthlyCreditsUsed,
    overageCredits,
    spendUsd: auth.context.usageSnapshot.monthlySpendUsd,
    hardSpendCapUsd:
      auth.context.project.hardCapUsd ??
      auth.context.billingAccount?.hardSpendCapUsd ??
      null,
    softSpendCapUsd:
      auth.context.project.softCapUsd ??
      auth.context.billingAccount?.softSpendCapUsd ??
      null,
  });
}
