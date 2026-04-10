export const maxDuration = 15;

import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getStakingRewards } from "@/server/services/cdp/staking";

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cdp/staking/rewards?walletAddress=0x...
 *
 * Get accumulated staking rewards for a Nex Wallet address.
 * Returns aggregated rewards across all active positions (ETH + SOL).
 *
 * Auth required: wallet owner only.
 * Rate limited: 30 requests per minute.
 *
 * Query params:
 * - walletAddress: string — The Nex Wallet address to query
 *
 * Response:
 * - { success: true, data: StakingRewardsResult }
 * - { success: false, error: { message: "..." } }
 */
export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cdp.staking.rewards.GET", async () => {
    try {
      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-staking-rewards",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Extract wallet address from query params
      const { searchParams } = new URL(request.url);
      const walletAddress = searchParams.get("walletAddress");

      if (!walletAddress || walletAddress.trim().length === 0) {
        return apiResponse.badRequest("walletAddress query parameter is required");
      }

      // Fetch rewards
      const rewards = await getStakingRewards(
        walletAddress.trim(),
        context.userId,
      );

      logger.info("cdp_staking_rewards_api_completed", {
        userId: context.userId,
        walletAddress,
        totalRewardsUsd: rewards.totalRewardsUsd,
        positionCount: rewards.positions.length,
      });

      return apiResponse.success(rewards);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("ownership verification failed")) {
        return apiResponse.forbidden("Address not linked to your account");
      }

      logger.error("cdp_staking_rewards_api_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to fetch staking rewards");
    }
  });
}
