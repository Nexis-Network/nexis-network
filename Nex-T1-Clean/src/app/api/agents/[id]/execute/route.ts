export const maxDuration = 30;

import { NextRequest } from "next/server";

import { executeLatestStrategy } from "@/lib/agents/execution/strategy-runner";
import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { withAgentAuth } from "@/server/api/helpers/with-agent-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: agentId } = await ctx.params;
    const auth = await withAgentAuth({ req, agentId });
    if (!auth.ok) return auth.response;

    const trades = await executeLatestStrategy(agentId);

    return createSuccessResponse(
      {
        ok: true,
        executedTrades: trades,
      },
      { status: 200, headers: { "X-Correlation-Id": auth.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
