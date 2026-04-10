import { NextResponse } from "next/server";

import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { apiResponse } from "@/lib/api-platform";
import { checkRateLimit, ensSubnameClaimRateLimit } from "@/server/security/rate-limit";
import { submitEnsSubnameClaim } from "@/server/services/ens/subnames";
import { EnsSubnameRuntimeUnavailableError } from "@/modules/ens/server/subnames.runtime";
import { SubmitEnsClaimSchema } from "./route.schema";

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
  const parsed = SubmitEnsClaimSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    const result = await submitEnsSubnameClaim({
      userId: context.userId,
      claimId: parsed.data.claimId,
      mainnetReverseSignature: parsed.data.mainnetReverseSignature as `0x${string}`,
      baseReverseSignature: parsed.data.baseReverseSignature as `0x${string}`,
    });

    return apiResponse.success(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit ENS subname claim.";
    const status = error instanceof EnsSubnameRuntimeUnavailableError
      ? 503
      : /session|active|not found/i.test(message)
        ? 409
        : 500;
    return apiResponse.error("ENS_SUBNAME_CLAIM_SUBMIT_ERROR", message, status);
  }
}
