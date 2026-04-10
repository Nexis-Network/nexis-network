import { NextResponse } from "next/server";

import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { provisionCdpWalletsForUser } from "@/server/services/cdp/provision";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * POST /api/wallets/cdp/provision
 *
 * Manually trigger Nex Wallet provisioning for the authenticated user.
 * This is a fallback in case the automatic bootstrap at signup failed
 * or Nex Wallets were enabled after the user already existed.
 *
 * Auth: Requires valid Supabase session.
 * Rate limiting: Handled by global middleware.
 */

export async function POST(request: Request): Promise<NextResponse> {
  return timeApiRoute("wallets_cdp_provision", async () => {
    try {
      const { context } = await resolveSupabaseContext(undefined, { request });

      if (!context) {
        return apiResponse.unauthorized("Valid Supabase session required");
      }

      logger.info({ userId: context.userId }, "cdp_provision_route_start");

      const result = await provisionCdpWalletsForUser({
        userId: context.userId,
        email: context.email,
      });

      logger.info(
        {
          userId: context.userId,
          evmSmartAccountAddress: result.evmSmartAccountAddress,
          solanaAddress: result.solanaAddress,
          conflictRecovered: result.conflictRecovered,
        },
        result.conflictRecovered
          ? "cdp_provision_route_conflict_recovered"
          : "cdp_provision_route_success",
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            evmSmartAccountAddress: result.evmSmartAccountAddress,
            solanaAddress: result.solanaAddress,
          },
        },
        { status: 200 },
      );
    } catch (error) {
      const message = getErrorMessage(error, "Nex Wallet provisioning failed");
      logger.error(
        {
          err: error instanceof Error ? error : undefined,
          errorMessage: message,
        },
        "cdp_provision_route_fail",
      );

      return apiResponse.error(
        "CDP_PROVISION_ERROR",
        "Failed to provision Nex Wallets. Please try again.",
        500,
      );
    }
  });
}
