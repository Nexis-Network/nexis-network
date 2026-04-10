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
import { sendFromCdpWallet } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const SendBodySchema = z.object({
  walletId: z.string().uuid("walletId must be a valid UUID"),
  to: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
  tokenAddress: z.string().optional(),
  chainId: z.union([z.number().int(), z.string()]),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_EXPLORER_MAP: Record<string, string> = {
  "8453": "https://basescan.org/tx/",
  "1": "https://etherscan.io/tx/",
  "42161": "https://arbiscan.io/tx/",
  "10": "https://optimistic.etherscan.io/tx/",
  solana: "https://solscan.io/tx/",
};

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/agents/[id]/wallet/send
 *
 * Execute a token transfer from an agent's Nex Wallet.
 * Verifies agent ownership AND that the wallet belongs to the agent.
 *
 * Auth required: agent owner only.
 * Rate limited: 20 requests per minute.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_send.POST", async () => {
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
        "agent-wallet-send",
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
          "Only the agent owner can send from agent wallets",
        );
      }

      // Parse and validate body
      const raw = await request.json().catch(() => ({}));
      const bodyParsed = SendBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { walletId, to, amount, tokenAddress, chainId } = bodyParsed.data;
      const chainIdStr = String(chainId);

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
      const platform = (wallet.platform as string) === "solana" ? "solana" as const : "evm" as const;

      // Delegate to the Nex Wallet-operations service layer
      const result = await sendFromCdpWallet(
        {
          fromAddress: walletAddress,
          toAddress: to,
          amount,
          tokenAddress,
          chainId,
          platform,
        },
        context.userId,
        { agentId: id },
      );

      const txHash = result.txHash;

      // Build deterministic transaction ID matching the table schema:
      // "evm:{chainId}:{txHash}" | "solana:{txHash}"
      const txId =
        platform === "solana"
          ? `solana:${txHash}`
          : `evm:${chainIdStr}:${txHash}`;

      // Log transaction to agent_wallet_transactions
      const { error: logError } = await supabase
        .from("agent_wallet_transactions")
        .insert({
          id: txId,
          agent_wallet_id: walletId,
          agent_id: id,
          tx_hash: txHash,
          chain: chainIdStr,
          direction: "out",
          category: "transfer",
          from_address: walletAddress,
          to_address: to,
          timestamp: new Date().toISOString(),
          raw: {
            amount,
            tokenAddress: tokenAddress ?? null,
            platform,
            status: "submitted",
          },
        });

      if (logError) {
        logger.warn("agent_wallet_send_tx_log_failed", {
          agentId: id,
          walletId,
          txHash,
          error: logError.message,
        });
      }

      logger.info("agent_wallet_send_completed", {
        agentId: id,
        walletId,
        to,
        amount,
        platform,
        chainId: chainIdStr,
        txHash,
        userId: context.userId,
      });

      const explorerBase =
        CHAIN_EXPLORER_MAP[platform === "solana" ? "solana" : chainIdStr] ??
        CHAIN_EXPLORER_MAP["8453"]!;

      return apiResponse.success({
        txHash,
        status: result.status,
        explorerUrl: `${explorerBase}${txHash}`,
      });
    } catch (error) {
      logger.error("agent_wallet_send_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to send transaction");
    }
  });
}
