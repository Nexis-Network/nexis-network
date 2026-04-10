
import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  category: z
    .enum(["swap", "transfer", "bridge", "stake", "unstake", "approve", "other"])
    .optional(),
});

/**
 * GET /api/agents/[id]/transactions?limit=50&offset=0&category=swap
 *
 * Returns paginated agent wallet transactions from the
 * `agent_wallet_transactions` table.
 *
 * Query params:
 *   - limit:    Number of records to return (default 50, max 200)
 *   - offset:   Pagination offset (default 0)
 *   - category: Optional filter by transaction category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  return timeApiRoute("agents.transactions.GET", async () => {
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
          "You do not have access to this agent's transactions",
        );
      }

      // Parse query params
      const searchParams = request.nextUrl.searchParams;
      const queryParsed = QuerySchema.safeParse({
        limit: searchParams.get("limit") ?? 50,
        offset: searchParams.get("offset") ?? 0,
        category: searchParams.get("category") || undefined,
      });

      if (!queryParsed.success) {
        return apiResponse.validationError(queryParsed.error);
      }

      const { limit, offset, category } = queryParsed.data;

      // Build query
      let query = supabase
        .from("agent_wallet_transactions")
        .select("*", { count: "exact" })
        .eq("agent_id", id)
        .order("timestamp", { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq("category", category);
      }

      const { data: transactions, error: txError, count } = await query;

      if (txError) {
        logger.error("agents_transactions_query_failed", {
          agentId: id,
          error: txError.message,
        });
        return apiResponse.internalError("Failed to fetch agent transactions");
      }

      const total = count ?? 0;
      const hasMore = offset + limit < total;

      return apiResponse.success(transactions ?? [], {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        hasMore,
      });
    } catch (error) {
      logger.error("agents_transactions_get_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to fetch agent transactions");
    }
  });
}
