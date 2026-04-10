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
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { executeCdpSwap } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const SwapBodySchema = z.object({
  walletId: z.string().uuid("walletId must be a valid UUID"),
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
 * POST /api/agents/[id]/wallet/swap
 *
 * Execute a token swap from an agent's Nex Wallet.
 * Gets a quote via createSwapQuote, executes via sendTransaction,
 * and logs the transaction.
 *
 * Auth required: agent owner only.
 * Rate limited: 10 requests per minute.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_swap.POST", async () => {
    try {
      const { id } = await params;

      // Validate route params
      const paramsParsed = ParamsSchema.safeParse({ id });
      if (!paramsParsed.success) {
        return apiResponse.validationError(paramsParsed.error);
      }

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-wallet-swap",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Agent ownership check
      const supabase = getSupabaseAdminClient();
      const { data: agent, error: agentError } = await supabase
        .from("agent")
        .select("id,owner_user_id,org_id")
        .eq("id", id)
        .single();

      if (agentError || !agent) {
        return apiResponse.notFound("Agent not found");
      }

      if (agent.owner_user_id !== context.userId) {
        return apiResponse.forbidden(
          "Only the agent owner can swap from agent wallets",
        );
      }

      // Parse and validate body
      const raw = await request.json().catch(() => ({}));
      const bodyParsed = SwapBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { walletId, fromToken, toToken, amount, slippageBps, chainId } =
        bodyParsed.data;

      // Verify the wallet belongs to this agent
      const { data: wallet, error: walletError } = await supabase
        .from("agent_wallets")
        .select("id,agent_id,address,platform,chain_id")
        .eq("id", walletId)
        .eq("agent_id", id)
        .eq("status", "active")
        .single();

      if (walletError || !wallet) {
        return apiResponse.badRequest(
          "Wallet not found or does not belong to this agent",
          "WALLET_NOT_FOUND",
        );
      }

      const walletAddress = wallet.address as string;

      if (wallet.platform !== "evm") {
        return apiResponse.badRequest(
          "Swap is only supported for EVM wallets",
          "UNSUPPORTED_PLATFORM",
        );
      }

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
        { agentId: id },
      );

      const txHash = result.txHash;
      const explorerBase =
        CHAIN_EXPLORER_MAP[chainId] ?? "https://basescan.org/tx/";

      // Build deterministic transaction ID matching the table schema:
      // "evm:{chainId}:{txHash}"
      const txId = `evm:${chainId}:${txHash}`;

      // Log transaction to agent_wallet_transactions
      const { error: logError } = await supabase
        .from("agent_wallet_transactions")
        .insert({
          id: txId,
          agent_wallet_id: walletId,
          agent_id: id,
          tx_hash: txHash,
          chain: String(chainId),
          direction: "out",
          category: "swap",
          from_address: walletAddress,
          to_address: toToken,
          timestamp: new Date().toISOString(),
          raw: {
            fromToken,
            toToken,
            fromAmount: result.fromAmount,
            toAmount: result.toAmount,
            slippageBps,
            amount,
            platform: "evm",
            status: "submitted",
          },
        });

      if (logError) {
        logger.warn("agent_wallet_swap_tx_log_failed", {
          agentId: id,
          walletId,
          txHash,
          error: logError.message,
        });
      }

      logger.info("agent_wallet_swap_completed", {
        agentId: id,
        walletId,
        fromToken,
        toToken,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        chainId,
        txHash,
        userId: context.userId,
      });

      return apiResponse.success({
        txHash,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        price: result.toAmount,
        explorerUrl: `${explorerBase}${txHash}`,
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

      logger.error("agent_wallet_swap_failed", {
        error: message,
      });
      return apiResponse.internalError("Failed to execute swap");
    }
  });
}
