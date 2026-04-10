
import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getAgentPortfolioHistory } from "@/server/services/agent-portfolio-service";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/agents/[id]/portfolio/history?days=30
 *
 * Returns portfolio time-series data points for an agent, bucketed by day.
 * Useful for rendering historical performance charts.
 *
 * Query params:
 *   - days: Number of days to look back (default 30, max 365)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  return timeApiRoute("agents.portfolio_history.GET", async () => {
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
          "You do not have access to this agent's portfolio history",
        );
      }

      // Parse query params
      const searchParams = request.nextUrl.searchParams;
      const queryParsed = QuerySchema.safeParse({
        days: searchParams.get("days") ?? 30,
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const { days } = queryParsed.data;

      // Fetch historical data
      const history = await getAgentPortfolioHistory(id, days);

      return apiResponse.success(history);
    } catch (error) {
      logger.error("agents_portfolio_history_get_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError(
        "Failed to fetch agent portfolio history",
      );
    }
  });
}
