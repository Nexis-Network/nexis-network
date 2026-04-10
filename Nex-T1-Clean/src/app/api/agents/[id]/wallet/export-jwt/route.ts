
import { type NextRequest, NextResponse } from "next/server";
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
  mintAgentCdpJwt,
  buildAgentCdpSub,
} from "@/server/auth/cdp-jwt-bridge";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

/**
 * POST /api/agents/[id]/wallet/export-jwt
 *
 * Mint a short-lived RS256 CDP JWT for an agent's wallet.
 *
 * The returned token can be used by the client to authenticate against
 * CDP endpoints on behalf of the agent's embedded wallets. The `sub` claim
 * is scoped to the agent: `nex-agent:{agentId}:v{generation}`.
 *
 * Auth required: owner only.
 *
 * Returns: { token, sub, expiresAt }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.wallet_export_jwt.POST", async () => {
    try {
      // Rate limit — JWT minting is sensitive
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-wallet-export-jwt",
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
          "Only the agent owner can export wallet JWTs",
        );
      }

      // Resolve current generation from the latest active wallet
      const { data: walletRows, error: walletError } = await supabase
        .from("agent_wallets")
        .select("generation")
        .eq("agent_id", id)
        .eq("status", "active")
        .order("generation", { ascending: false })
        .limit(1);

      if (walletError) {
        logger.error("agent_wallet_generation_query_failed", {
          agentId: id,
          error: walletError.message,
        });
        return apiResponse.internalError(
          "Failed to resolve agent wallet generation",
        );
      }

      const generation =
        walletRows && walletRows.length > 0
          ? (walletRows[0].generation as number)
          : 1;

      // Mint agent-scoped CDP JWT
      const ttlSeconds = Number(process.env.CDP_JWT_TTL_SECONDS ?? 300);
      const token = await mintAgentCdpJwt(id, generation);
      const sub = buildAgentCdpSub(id, generation);
      const expiresAt = new Date(
        Date.now() + ttlSeconds * 1000,
      ).toISOString();

      logger.debug("agent_wallet_jwt_exported", {
        agentId: id,
        userId: context.userId,
        generation,
        sub,
      });

      return NextResponse.json(
        {
          success: true,
          data: { token, sub, expiresAt },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error("agents_wallet_export_jwt_failed", { error: message });

      // Do not leak internal error details for JWT-related failures
      return apiResponse.error(
        "JWT_MINT_ERROR",
        "Failed to generate agent wallet token",
        500,
      );
    }
  });
}
