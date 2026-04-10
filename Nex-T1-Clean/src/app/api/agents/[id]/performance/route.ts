export const maxDuration = 15;

import { connection, NextRequest } from "next/server";

import {
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/request-utils";
import { resolveAgentAccess } from "@/server/agents/agent-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const RANGE_TO_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const { id: agentId } = await context.params;
    if (!agentId) {
      return createErrorResponse(new Error("agentId missing"), { status: 400 });
    }

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const rangeParam = new URL(req.url).searchParams.get("range") ?? "30d";
    const lookbackDays = RANGE_TO_DAYS[rangeParam] ?? 30;
    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const selectFields = access.shouldRedactConfig
      ? "bucket, pnl_usd, trades"
      : "bucket, pnl_usd, volume_usd, wins, losses, trades";
    const { data, error } = await access.service
      .from("agent_performance_series")
      .select(selectFields)
      .eq("agent_id", agentId)
      .eq("org_id", access.agent.orgId)
      .gte("bucket", sinceDate.toISOString())
      .order("bucket", { ascending: true })
      .limit(180);

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Failed to load performance series",
      });
    }

    return createSuccessResponse(
      { ok: true, series: data ?? [] },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
