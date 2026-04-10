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
import { resolveOwnedCdpWallet } from "@/server/services/cdp/ownership";
import { executeCdpSwap } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const SwapBodySchema = z.object({
  fromToken: z.string().min(1, "fromToken is required"),
  toToken: z.string().min(1, "toToken is required"),
  amount: z.string().min(1, "amount is required"),
  slippageBps: z.number().int().min(1).max(5000).optional().default(100),
  chainId: z.number().int().default(8453),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_EXPLORER_MAP: Record<number, string> = {
  8453: "https://basescan.org/tx/",
  1: "https://etherscan.io/tx/",
  42161: "https://arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
};

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/wallets/[address]/swap
 *
 * Execute a token swap from a Nex Wallet via CDP's swap API.
 * Uses createSwapQuote to get an executable quote with transaction data,
 * then sends the transaction via sendTransaction.
 *
 * Auth required: wallet owner only.
 * Rate limited: 10 requests per minute.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  return timeApiRoute("cdp.wallets.swap.POST", async () => {
    try {
      const { address } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-swap",
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
      const bodyParsed = SwapBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { fromToken, toToken, amount, slippageBps, chainId } =
        bodyParsed.data;

      const ownedWallet = await resolveOwnedCdpWallet(context.userId, address);
      if (!ownedWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }
      const walletAddress = ownedWallet.address;

      // Delegate to the Nex Wallet-operations service layer
      const result = await executeCdpSwap(
        {
          walletAddress,
          fromToken,
          toToken,
          amount,
          slippageBps,
          chainId,
        },
        context.userId,
      );

      const explorerBase =
        CHAIN_EXPLORER_MAP[chainId] ?? "https://basescan.org/tx/";

      logger.info("cdp_wallet_swap_completed", {
        address: walletAddress,
        fromToken,
        toToken,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        chainId,
        txHash: result.txHash,
        userId: context.userId,
      });

      return apiResponse.success({
        txHash: result.txHash,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        price: result.toAmount,
        explorerUrl: `${explorerBase}${result.txHash}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Surface liquidity errors as user-facing errors
      if (message.includes("No liquidity")) {
        return apiResponse.badRequest(
          "No liquidity available for this swap pair",
          "NO_LIQUIDITY",
        );
      }

      logger.error("cdp_wallet_swap_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to execute swap");
    }
  });
}
