
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

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const FundBodySchema = z.object({
  walletId: z.string().min(1, "walletId is required"),
  txHash: z.string().min(1, "txHash is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1, "Currency is required").max(20),
  chainId: z.union([z.number().int(), z.string()]),
  direction: z.enum(["deposit", "withdrawal"]).default("deposit"),
});

/**
 * POST /api/agents/[id]/wallet/fund
 *
 * Record a funding event (deposit or withdrawal) in the
 * `agent_funding_events` table.
 *
 * Body:
 *   - walletId:  Agent wallet ID
 *   - txHash:    On-chain transaction hash
 *   - amount:    Funding amount (positive number)
 *   - currency:  Asset currency code (e.g. "ETH", "USDC", "SOL")
 *   - chainId:   Chain identifier (number or string like "solana")
 *   - direction: "deposit" (default) or "withdrawal"
 *
 * Auth required: owner only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_fund.POST", async () => {
    try {
      // Rate limit
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-wallet-fund",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      const { id } = await params;

      const paramsParsed = ParamsSchema.safeParse({ id });
      if (!paramsParsed.success) {
        return apiResponse.validationError(paramsParsed.error);
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
          "Only the agent owner can record funding events",
        );
      }

      // Parse and validate body
      const raw = await request.json().catch(() => ({}));
      const bodyParsed = FundBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { walletId, txHash, amount, currency, chainId, direction } =
        bodyParsed.data;

      // Verify the wallet belongs to this agent
      const { data: wallet, error: walletError } = await supabase
        .from("agent_wallets")
        .select("id,agent_id")
        .eq("id", walletId)
        .eq("agent_id", id)
        .single();

      if (walletError || !wallet) {
        return apiResponse.badRequest(
          "Wallet not found or does not belong to this agent",
          "WALLET_NOT_FOUND",
        );
      }

      // Insert funding event — column names must match the migration schema
      const { data: fundingEvent, error: insertError } = await supabase
        .from("agent_funding_events")
        .insert({
          agent_id: id,
          agent_wallet_id: walletId,
          funded_by: context.userId,
          tx_hash: txHash,
          amount,
          token_symbol: currency.toUpperCase(),
          chain: String(chainId),
          direction,
          created_at: new Date().toISOString(),
        })
        .select("id,agent_id,agent_wallet_id,tx_hash,amount,token_symbol,chain,direction,created_at")
        .single();

      if (insertError) {
        // Handle duplicate tx_hash gracefully
        if (
          insertError.code === "23505" ||
          insertError.message.includes("duplicate")
        ) {
          return apiResponse.error(
            "DUPLICATE_TX",
            "A funding event with this transaction hash already exists",
            409,
          );
        }

        logger.error("agent_funding_event_insert_failed", {
          agentId: id,
          walletId,
          error: insertError.message,
        });
        return apiResponse.internalError("Failed to record funding event");
      }

      logger.info("agent_funding_event_recorded", {
        agentId: id,
        walletId,
        txHash,
        amount: String(amount),
        currency,
        direction,
      });

      return apiResponse.created(fundingEvent);
    } catch (error) {
      logger.error("agents_wallet_fund_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to record funding event");
    }
  });
}
