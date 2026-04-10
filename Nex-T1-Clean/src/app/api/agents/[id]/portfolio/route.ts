
import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { fetchAgentPortfolio } from "@/server/services/agent-portfolio-service";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

/**
 * GET /api/agents/[id]/portfolio
 *
 * Returns the aggregated portfolio summary for an agent across all its
 * active Nex Wallets. Requires authentication. The caller must be either
 * the agent owner or the agent must have public/unlisted visibility.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.portfolio.GET", async () => {
    try {
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

      // Agent access check
      const supabase = getSupabaseAdminClient();
      const { data: agent, error: agentError } = await supabase
        .from("agent")
        .select("id,owner_user_id,org_id,visibility")
        .eq("id", id)
        .single();

      if (agentError || !agent) {
        return apiResponse.notFound("Agent not found");
      }

      const isOwner = agent.owner_user_id === context.userId;
      const isPublic =
        agent.visibility === "public" || agent.visibility === "unlisted";

      if (!isOwner && !isPublic) {
        return apiResponse.forbidden(
          "You do not have access to this agent's portfolio",
        );
      }

      // Fetch aggregated portfolio
      const portfolio = await fetchAgentPortfolio(id);

      return apiResponse.success(portfolio);
    } catch (error) {
      logger.error("agents_portfolio_get_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to fetch agent portfolio");
    }
  });
}
