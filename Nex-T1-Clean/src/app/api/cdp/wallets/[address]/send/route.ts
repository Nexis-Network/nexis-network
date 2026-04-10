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
import { resolveOwnedCdpWallet } from "@/server/services/cdp/ownership";
import { sendFromCdpWallet } from "@/server/services/cdp/wallet-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const SendBodySchema = z.object({
  to: z.string().min(1, "Recipient address is required"),
  amount: z.string().min(1, "Amount is required"),
  tokenAddress: z.string().optional(),
  chainId: z.union([z.number().int(), z.string()]),
  platform: z.enum(["evm", "solana"]),
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

function getExplorerUrl(chainId: string, txHash: string): string {
  const base = CHAIN_EXPLORER_MAP[chainId] ?? CHAIN_EXPLORER_MAP["8453"]!;
  return `${base}${txHash}`;
}

async function logAgentWalletTransaction(
  address: string,
  txHash: string,
  params: {
    to: string;
    amount: string;
    tokenAddress: string | null;
    chainId: string;
    platform: string;
  },
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    // Check if this address belongs to an agent wallet
    const { data: agentWallet } = await supabase
      .from("agent_wallets")
      .select("id,agent_id")
      .ilike("address", address)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (agentWallet) {
      // Build composite PK per migration schema: "evm:{chainId}:{txHash}" or "solana:{txHash}"
      const txId =
        params.platform === "solana"
          ? `solana:${txHash}`
          : `evm:${params.chainId}:${txHash}`;

      const now = new Date().toISOString();

      await supabase.from("agent_wallet_transactions").insert({
        id: txId,
        agent_wallet_id: agentWallet.id,
        agent_id: agentWallet.agent_id,
        tx_hash: txHash,
        chain: params.platform === "solana" ? "solana" : `evm:${params.chainId}`,
        direction: "out" as const,
        category: "transfer" as const,
        from_address: address,
        to_address: params.to,
        value_usd: null,
        gas_usd: null,
        tokens_out: params.tokenAddress
          ? [{ address: params.tokenAddress, amount: params.amount }]
          : [{ address: "native", amount: params.amount }],
        tokens_in: null,
        summary: `Transfer ${params.amount} to ${params.to}`,
        timestamp: now,
        raw: {
          platform: params.platform,
          tokenAddress: params.tokenAddress,
          chainId: params.chainId,
          status: "submitted",
        },
      });
    }
  } catch (err) {
    // Non-critical: do not fail the main operation
    logger.warn("cdp_wallet_send_agent_log_failed", {
      error: err instanceof Error ? err.message : String(err),
      address,
      txHash,
    });
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/wallets/[address]/send
 *
 * Execute a token transfer from a Nex Wallet.
 * Supports EVM (native + ERC-20) transfers via CDP SDK sendTransaction.
 * Solana transfers require pre-built serialized transactions.
 *
 * Auth required: wallet owner only.
 * Rate limited: 20 requests per minute.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  return timeApiRoute("cdp.wallets.send.POST", async () => {
    try {
      const { address } = await params;

      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-send",
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
      const bodyParsed = SendBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { to, amount, tokenAddress, chainId, platform } = bodyParsed.data;
      const chainIdStr = String(chainId);

      const ownedWallet = await resolveOwnedCdpWallet(context.userId, address);
      if (!ownedWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }
      const walletAddress = ownedWallet.address;

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
      );

      const txHash = result.txHash;

      // Log transaction for agent wallets (best-effort)
      await logAgentWalletTransaction(walletAddress, txHash, {
        to,
        amount,
        tokenAddress: tokenAddress ?? null,
        chainId: chainIdStr,
        platform,
      });

      logger.info("cdp_wallet_send_completed", {
        address: walletAddress,
        to,
        amount,
        platform,
        chainId: chainIdStr,
        txHash,
        userId: context.userId,
      });

      return apiResponse.success({
        txHash,
        status: result.status,
        explorerUrl: getExplorerUrl(
          platform === "solana" ? "solana" : chainIdStr,
          txHash,
        ),
      });
    } catch (error) {
      logger.error("cdp_wallet_send_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to send transaction");
    }
  });
}
