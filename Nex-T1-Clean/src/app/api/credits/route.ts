import { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  getNonProductionTestModeUserId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";
import { withAuth } from "@/server/security/with-auth";
import { getCreditBalance } from "@/server/services/credits";

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  const userId =
    auth.session?.user?.id ??
    (isNonProductionTestMode({ request })
      ? getNonProductionTestModeUserId({ request })
      : null);
  if (!userId) {
    return apiResponse.unauthorized("unauthorized");
  }

  try {
    const balance = await getCreditBalance(userId);
    const resetIso = balance.resetAt.toISOString();

    const headers = new Headers({
      "X-Credits-Limit": balance.limit.toString(),
      "X-Credits-Remaining": balance.remaining.toString(),
      "X-Credits-Monthly-Remaining": balance.monthlyRemaining.toString(),
      "X-Credits-Overage": balance.overageCredits.toString(),
      "X-Credits-Reset": balance.resetAt.getTime().toString(),
      "X-Credits-Plan": balance.plan,
    });

    const response = apiResponse.success(
      {
        remaining: balance.remaining,
        limit: balance.limit,
        used: balance.used,
        monthlyRemaining: balance.monthlyRemaining,
        overageCredits: balance.overageCredits,
        plan: balance.plan,
        reset: resetIso,
      }
    );

    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    logger.error("[credits] GET failed", { error });
    return apiResponse.internalError(
      error instanceof Error ? error.message : "Failed to fetch remaining credits"
    );
  }
}
