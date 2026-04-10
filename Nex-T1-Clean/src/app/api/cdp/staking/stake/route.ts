export const maxDuration = 30;

import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { stakeAsset } from "@/server/services/cdp/staking";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const StakeBodySchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  amount: z.string().regex(/^\d+$/, "Amount must be an integer string in base units (wei/lamports)"),
  asset: z.enum(["eth", "sol"], {
    errorMap: () => ({ message: "Asset must be 'eth' or 'sol'" }),
  }),
  network: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/staking/stake
 *
 * Initiate a staking operation for ETH or SOL from a Nex Wallet.
 *
 * Auth required: wallet owner only.
 * Rate limited: 10 requests per minute.
 *
 * Request body:
 * - walletAddress: string — The Nex Wallet address
 * - amount: string — Amount in base units (wei for ETH, lamports for SOL)
 * - asset: "eth" | "sol"
 * - network?: string — Optional network override
 *
 * Response:
 * - { success: true, data: StakeResult }
 * - { success: false, error: { message: "..." } }
 */
export async function POST(request: NextRequest) {
  return timeApiRoute("cdp.staking.stake.POST", async () => {
    try {
      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-staking-stake",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Parse and validate body
      const raw = await request.json().catch(() => ({}));
      const bodyParsed = StakeBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { walletAddress, amount, asset, network } = bodyParsed.data;

      // Execute stake
      const result = await stakeAsset(
        { walletAddress, amount, asset, network },
        context.userId,
      );

      logger.info("cdp_staking_stake_api_completed", {
        userId: context.userId,
        walletAddress,
        asset,
        amount,
        stakeId: result.stakeId,
        txHash: result.txHash,
      });

      return apiResponse.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Return ownership errors as 403
      if (message.includes("ownership verification failed")) {
        return apiResponse.forbidden("Address not linked to your account");
      }

      // Return validation errors as 400
      if (message.includes("Invalid") || message.includes("must be")) {
        return apiResponse.badRequest(message);
      }

      logger.error("cdp_staking_stake_api_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to initiate staking operation");
    }
  });
}
