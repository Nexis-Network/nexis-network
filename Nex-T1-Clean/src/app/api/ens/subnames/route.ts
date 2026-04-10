import { NextResponse } from "next/server";

import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { apiResponse } from "@/lib/api-platform";
import { getEnsSubnameStatus } from "@/server/services/ens/subnames";

const NON_PRODUCTION_MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";


export async function GET(request: Request): Promise<NextResponse> {
  const { context } = await resolveSupabaseContext(undefined, { request });
  if (!context) {
    return apiResponse.unauthorized();
  }

  if (!ENS_SUBNAME_CLAIM_ENABLED) {
    return apiResponse.success({
      claim: null,
      walletAddress: null,
      canClaim: false,
      claimAvailabilityError: "ENS claims are temporarily disabled.",
      suggestedLabel: "",
      validationError: null,
    });
  }

  if (
    process.env.NODE_ENV !== "production" &&
    context.userId === NON_PRODUCTION_MOCK_USER_ID
  ) {
    return apiResponse.success({
      claim: null,
      walletAddress: null,
      canClaim: false,
      claimAvailabilityError: null,
      suggestedLabel: "",
      validationError: null,
    });
  }

  try {
    const status = await getEnsSubnameStatus(context.userId, context.email);
    return apiResponse.success(status);
  } catch (error) {
    return apiResponse.error(
      "ENS_SUBNAME_STATUS_ERROR",
      error instanceof Error ? error.message : "Failed to load ENS subname status.",
      500,
    );
  }
}
