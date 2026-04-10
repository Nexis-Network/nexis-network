
import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getOpenPositions } from "@/server/services/agent-position-tracker";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

/**
 * GET /api/agents/[id]/positions
 *
 * Returns all open positions for an agent, ordered by notional value
 * descending. Each position includes current price, unrealized P&L,
 * and percentage change.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.positions.GET", async () => {
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
          "You do not have access to this agent's positions",
        );
      }

      // Fetch open positions
      const positions = await getOpenPositions(id);

      return apiResponse.success({
        agentId: id,
        positions,
        count: positions.length,
      });
    } catch (error) {
      logger.error("agents_positions_get_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to fetch agent positions");
    }
  });
}
