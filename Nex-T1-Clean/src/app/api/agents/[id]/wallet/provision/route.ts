export const maxDuration = 30;

import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { provisionAgentCdpWallets } from "@/server/services/cdp/agent-provision";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

/**
 * POST /api/agents/[id]/wallet/provision
 *
 * Manually trigger Nex Wallet provisioning for an agent. Creates EVM Smart
 * Account and Solana wallets via CDP Custom Auth.
 *
 * - Auth required: owner only
 * - Rate limited: 5 requests per minute per IP
 * - Idempotent: returns existing wallets if already provisioned
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_provision.POST", async () => {
    try {
      const { id } = await params;

      const paramsParsed = ParamsSchema.safeParse({ id });
      if (!paramsParsed.success) {
        return apiResponse.validationError(paramsParsed.error);
      }

      // Rate limit check
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-wallet-provision",
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
          "Only the agent owner can provision wallets",
        );
      }

      // Provision Nex Wallets
      const result = await provisionAgentCdpWallets({
        agentId: id,
        ownerUserId: context.userId,
      });

      logger.info("agent_wallet_provision_completed", {
        agentId: id,
        userId: context.userId,
        generation: result.generation,
        evmAddress: result.evmSmartAccountAddress,
        solanaAddress: result.solanaAddress,
      });

      return apiResponse.created(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      // Lock contention is a 409 Conflict, not a 500
      if (message.includes("already in progress")) {
        return apiResponse.error(
          "PROVISION_IN_PROGRESS",
          "Wallet provisioning is already in progress. Try again in a moment.",
          409,
        );
      }

      logger.error("agents_wallet_provision_failed", { error: message });
      return apiResponse.internalError("Failed to provision agent wallets");
    }
  });
}
