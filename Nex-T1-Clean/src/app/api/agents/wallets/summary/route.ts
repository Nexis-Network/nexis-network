
import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import {
  getSupabaseErrorMessage,
  isMissingSchemaObjectError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { isNonProductionTestMode } from "@/server/auth/test-mode";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

type AgentWalletSummaryRow = {
  agent_id: string;
  agent_name: string | null;
  agent_slug: string | null;
  avatar_url: string | null;
  owner_user_id: string | null;
  address: string | null;
  chain_id: number | null;
  platform: string | null;
  label: string | null;
  status: string | null;
  generation: number | null;
  balance_usd: number;
};

type AgentWalletFallbackRow = {
  agent_id: string | null;
  owner_id: string | null;
  generation: number | null;
  address: string | null;
  chain_id: number | null;
  platform: string | null;
  label: string | null;
  status: string | null;
  agent:
    | {
        name: string | null;
        slug: string | null;
        avatar_url: string | null;
        owner_user_id: string | null;
      }
    | Array<{
        name: string | null;
        slug: string | null;
        avatar_url: string | null;
        owner_user_id: string | null;
      }>
    | null;
};

function mapFallbackRows(
  rows: AgentWalletFallbackRow[] | null | undefined,
  userId: string,
): AgentWalletSummaryRow[] {
  return (rows ?? [])
    .filter((row) => typeof row.agent_id === "string" && row.agent_id.length > 0)
    .map((row) => {
      const agent = Array.isArray(row.agent) ? (row.agent[0] ?? null) : row.agent;
      return {
        agent_id: row.agent_id as string,
        agent_name: agent?.name ?? null,
        agent_slug: agent?.slug ?? null,
        avatar_url: agent?.avatar_url ?? null,
        owner_user_id: agent?.owner_user_id ?? row.owner_id ?? userId,
        address: row.address ?? null,
        chain_id: row.chain_id ?? null,
        platform: row.platform ?? null,
        label: row.label ?? null,
        status: row.status ?? "active",
        generation: row.generation ?? 1,
        balance_usd: 0,
      };
    });
}

function isExpectedPortfolioSummaryViewError(error: unknown): boolean {
  const message = getSupabaseErrorMessage(error) ?? "";
  return (
    isMissingSchemaObjectError(error) &&
    /agent_portfolio_summary/i.test(message)
  );
}

/**
 * GET /api/agents/wallets/summary
 *
 * Returns all agents with their wallet summaries for the authenticated user
 * in a SINGLE database query against the `agent_portfolio_summary` view.
 *
 * This replaces the N+1 pattern where each agent's portfolio was fetched
 * individually via `/api/agents/{id}/portfolio`.
 */
export async function GET(request: NextRequest) {
  return timeApiRoute("agents.wallets.summary.GET", async () => {
    await connection();
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);

    try {
      const { context } = await resolveSupabaseContext(cookieBridge, { request });
      if (!context) {
        if (isNonProductionTestMode({ cookies: jar, request })) {
          return cookieBridge.commit(apiResponse.success({ agents: [] }));
        }
        return cookieBridge.commit(apiResponse.unauthorized("Valid session required"));
      }

      const supabase = getSupabaseAdminClient();

      const { data, error } = await supabase
        .from("agent_portfolio_summary")
        .select("*")
        .eq("owner_user_id", context.userId);

      if (error) {
        const expectedViewUnavailable = isExpectedPortfolioSummaryViewError(error);
        if (!expectedViewUnavailable) {
          logger.error("agents_wallets_summary_view_query_failed", {
            userId: context.userId,
            ...toSupabaseLogContext(error),
          });
        }

        // Compatibility fallback for environments where the view is not yet
        // deployed or temporarily unavailable. This still returns persisted
        // agent wallet rows from `agent_wallets`.
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("agent_wallets")
          .select("agent_id,owner_id,generation,address,chain_id,platform,label,status,agent:agent_id(name,slug,avatar_url,owner_user_id)")
          .eq("owner_id", context.userId)
          .in("status", ["active", "provisioning"])
          .order("generation", { ascending: false });

        if (fallbackError) {
          logger.warn("agents_wallets_summary_fallback_query_failed", {
            userId: context.userId,
            error: fallbackError.message,
          });
          return cookieBridge.commit(apiResponse.success({ agents: [] }));
        }

        const fallbackRows = mapFallbackRows(
          (fallbackData ?? []) as AgentWalletFallbackRow[],
          context.userId,
        );

        if (!expectedViewUnavailable) {
          logger.warn("agents_wallets_summary_fallback_used", {
            userId: context.userId,
            rowCount: fallbackRows.length,
          });
        }

        return cookieBridge.commit(apiResponse.success({ agents: fallbackRows }));
      }

      return cookieBridge.commit(apiResponse.success({ agents: data ?? [] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("agents_wallets_summary_failed", { error: message });
      return cookieBridge.commit(
        apiResponse.internalError("Failed to fetch agent wallet summaries"),
      );
    }
  });
}
