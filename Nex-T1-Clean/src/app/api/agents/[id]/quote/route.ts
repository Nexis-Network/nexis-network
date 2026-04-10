export const maxDuration = 15;

import { connection, NextRequest } from "next/server";

import { quoteZeroExSwapInstruction } from "@/lib/agents/execution/zeroex-executor";
import { loadStrategyExecutionContext } from "@/lib/agents/execution/strategy-runner";
import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { withAgentAuth } from "@/server/api/helpers/with-agent-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  await connection();
  try {
    const { id: agentId } = await ctx.params;
    const auth = await withAgentAuth({ req, agentId });
    if (!auth.ok) return auth.response;

    const { context, instructions } = await loadStrategyExecutionContext(agentId);
    const quotes = await Promise.all(
      instructions.map(async (instruction) => ({
        nodeId: instruction.node.id,
        summary: instruction.node.title,
        amountMode: instruction.amountMode,
        sellToken: instruction.sellToken,
        buyToken: instruction.buyToken,
        chainId: instruction.chainId,
        slippageBps: instruction.slippageBps,
        amount: instruction.amount,
        data: await quoteZeroExSwapInstruction(instruction),
      })),
    );

    return createSuccessResponse(
      { ok: true, quotes, snapshotId: context.strategySnapshotId },
      { headers: { "X-Correlation-Id": auth.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
