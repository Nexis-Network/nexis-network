import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";

import { enrichEvmAgentTrades } from "@/server/agents/trades/enrich-evm";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";


import { logger } from '@/lib/logger';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cron.agent-trades.reconcile", async () => {
    const secret = process.env.CRON_SECRET ?? "";
    const authHeader = request.headers.get("authorization");

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const url = new URL(request.url);
    const sinceHoursRaw = Number(url.searchParams.get("sinceHours") ?? "168");
    const sinceHours = Number.isFinite(sinceHoursRaw) ? Math.max(1, Math.min(24 * 30, sinceHoursRaw)) : 168;
    const enrichLimitRaw = Number(url.searchParams.get("enrichLimit") ?? "50");
    const enrichLimit = Number.isFinite(enrichLimitRaw) ? Math.max(1, Math.min(100, enrichLimitRaw)) : 50;

    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

    try {
      const supabase = createServiceRoleClient();
      const evm = await enrichEvmAgentTrades({ sinceIso: since, limit: enrichLimit });
      const { data, error } = await supabase.rpc("reconcile_agent_trade_metrics", { p_since: since });
      if (error) {
        return apiResponse.internalError(error.message);
      }

      return apiResponse.success({
        ok: true,
        since,
        evm,
        updated: data ?? null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[cron] agent trade reconcile failed", error);
      return apiResponse.internalError("Internal Server Error");
    }
  });
}
