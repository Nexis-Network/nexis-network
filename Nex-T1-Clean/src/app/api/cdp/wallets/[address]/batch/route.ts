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
import {
  executeBatchUserOperation,
  type BatchCall,
} from "@/server/services/cdp/batch-operations";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const BatchCallSchema = z.object({
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address for 'to' field"),
  value: z
    .string()
    .regex(/^\d+$/, "Value must be a non-negative integer string (wei)")
    .optional(),
  data: z
    .string()
    .regex(/^0x[a-fA-F0-9]*$/, "Data must be a valid hex string (0x-prefixed)")
    .optional(),
});

const BatchBodySchema = z.object({
  calls: z
    .array(BatchCallSchema)
    .min(1, "At least one call is required")
    .max(20, "Maximum 20 calls per batch"),
  chainId: z.number().int().positive("Chain ID must be a positive integer"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_EXPLORER_MAP: Record<string, string> = {
  "8453": "https://basescan.org/tx/",
  "84532": "https://sepolia.basescan.org/tx/",
  "1": "https://etherscan.io/tx/",
  "11155111": "https://sepolia.etherscan.io/tx/",
  "42161": "https://arbiscan.io/tx/",
  "10": "https://optimistic.etherscan.io/tx/",
  "137": "https://polygonscan.com/tx/",
  "43114": "https://snowtrace.io/tx/",
};

async function verifyAddressOwnership(
  userId: string,
  address: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { count } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .ilike("address", address);

  return (count ?? 0) > 0;
}

function getExplorerUrl(chainId: string, hash: string): string | null {
  const base = CHAIN_EXPLORER_MAP[chainId];
  if (!base) return null;
  return `${base}${hash}`;
}

async function logAgentWalletBatchTx(
  address: string,
  userOpHash: string,
  params: {
    chainId: string;
    callCount: number;
    calls: BatchCall[];
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
      // Build composite PK per migration schema: "evm:{chainId}:{txHash}"
      const txId = `evm:${params.chainId}:${userOpHash}`;
      const now = new Date().toISOString();

      await supabase.from("agent_wallet_transactions").insert({
        id: txId,
        agent_wallet_id: agentWallet.id,
        agent_id: agentWallet.agent_id,
        tx_hash: userOpHash,
        chain: `evm:${params.chainId}`,
        direction: "out" as const,
        category: "contract" as const,
        from_address: address,
        to_address: params.calls[0]?.to ?? null,
        value_usd: null,
        gas_usd: null,
        tokens_in: null,
        tokens_out: null,
        summary: `Batch UserOperation with ${params.callCount} call(s)`,
        timestamp: now,
        raw: {
          platform: "evm",
          chainId: params.chainId,
          callCount: params.callCount,
          calls: params.calls,
          status: "submitted",
        },
      });
    }
  } catch (err) {
    // Non-critical: do not fail the main operation
    logger.warn("cdp_batch_agent_log_failed", {
      error: err instanceof Error ? err.message : String(err),
      address,
      userOpHash,
    });
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/cdp/wallets/[address]/batch
 *
 * Execute a batched UserOperation on an EVM Smart Account.
 * Combines multiple calls into a single atomic ERC-4337 UserOperation.
 *
 * Auth required: wallet owner only.
 * Rate limited: 10 requests per minute.
 *
 * Request body:
 * {
 *   "calls": [
 *     { "to": "0x...", "value": "0", "data": "0x..." },
 *     { "to": "0x...", "value": "1000000000000000", "data": "0x" }
 *   ],
 *   "chainId": 8453
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userOpHash": "0x...",
 *     "status": "submitted",
 *     "callCount": 2,
 *     "callResults": [{ "success": true }, { "success": true }],
 *     "explorerUrl": "https://basescan.org/tx/0x..."
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  return timeApiRoute("cdp.wallets.batch.POST", async () => {
    try {
      const { address } = await params;

      // Rate limit — stricter than send (10/min vs 20/min) since batch ops are heavier
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "cdp-wallet-batch",
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
      const bodyParsed = BatchBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { calls, chainId } = bodyParsed.data;
      const chainIdStr = String(chainId);

      // Verify wallet ownership
      const ownsWallet = await verifyAddressOwnership(
        context.userId,
        address,
      );
      if (!ownsWallet) {
        return apiResponse.forbidden(
          "Address not linked to your account",
        );
      }

      logger.info("cdp_batch_route_started", {
        address,
        chainId: chainIdStr,
        callCount: calls.length,
        userId: context.userId,
      });

      // Execute the batch operation
      const result = await executeBatchUserOperation(
        {
          walletAddress: address,
          calls: calls as BatchCall[],
          chainId,
        },
        context.userId,
      );

      // Log transaction for agent wallets (best-effort)
      await logAgentWalletBatchTx(address, result.userOpHash, {
        chainId: chainIdStr,
        callCount: calls.length,
        calls: calls as BatchCall[],
      });

      logger.info("cdp_batch_route_completed", {
        address,
        chainId: chainIdStr,
        userOpHash: result.userOpHash,
        callCount: calls.length,
        userId: context.userId,
      });

      const explorerUrl = getExplorerUrl(chainIdStr, result.userOpHash);

      return apiResponse.success({
        userOpHash: result.userOpHash,
        status: result.status,
        callCount: calls.length,
        callResults: result.callResults,
        ...(explorerUrl ? { explorerUrl } : {}),
      });
    } catch (error) {
      logger.error("cdp_batch_route_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to execute batch operation");
    }
  });
}
