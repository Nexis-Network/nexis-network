import { NextResponse } from "next/server";

import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit, ensSubnameClaimRateLimit } from "@/server/security/rate-limit";
import { prepareEnsSubnameClaim } from "@/server/services/ens/subnames";
import { EnsSubnameRuntimeUnavailableError } from "@/modules/ens/server/subnames.runtime";
import { PrepareEnsClaimSchema } from "./route.schema";

export async function POST(request: Request): Promise<NextResponse> {
  const { context } = await resolveSupabaseContext(undefined, { request });
  if (!context) {
    return apiResponse.unauthorized();
  }

  if (!ENS_SUBNAME_CLAIM_ENABLED) {
    return apiResponse.error(
      "ENS_SUBNAME_DISABLED",
      "ENS claims are temporarily disabled.",
      503,
    );
  }

  const rl = await checkRateLimit(context.userId, ensSubnameClaimRateLimit);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many ENS claim attempts", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = PrepareEnsClaimSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    const result = await prepareEnsSubnameClaim({
      userId: context.userId,
      email: context.email,
      requestedLabel: parsed.data.label,
    });

    return apiResponse.success(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare ENS subname claim.";
    const status = error instanceof EnsSubnameRuntimeUnavailableError
      ? 503
      : /taken|invalid|already have/i.test(message)
        ? 409
        : 500;
    return apiResponse.error("ENS_SUBNAME_CLAIM_PREPARE_ERROR", message, status);
  }
}
