export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { withAgentAuth } from "@/server/api/helpers/with-agent-auth";
import { canManageAgent } from "@/server/agents/access";

const TradeSchema = z.object({
  idempotencyKey: z.string().min(8),
  executedAt: z.string().datetime().optional(),
  side: z.enum(["buy", "sell", "short", "cover", "liquidate", "rebalance"]).optional(),
  baseAsset: z.string().optional(),
  quoteAsset: z.string().optional(),
  amount: z.string().optional(),
  notionalUsd: z.union([z.string(), z.number()]).optional(),
  pnlUsd: z.union([z.string(), z.number()]).optional(),
  feesUsd: z.union([z.string(), z.number()]).optional(),
  balancePre: z.any().optional(),
  balancePost: z.any().optional(),
  feesBreakdown: z.any().optional(),
  txHash: z.string().optional(),
  venue: z.string().min(1).optional(),
  chainId: z.number().int().positive().optional(),
  walletAddress: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const BackfillSchema = z.object({
  agentVersionId: z.string().uuid().optional(),
  trades: z.array(TradeSchema).min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: agentId } = await ctx.params;
    const raw = await req.json().catch(() => ({}));
    const input = BackfillSchema.parse(raw);

    const auth = await withAgentAuth({ req, agentId });
    if (!auth.ok) return auth.response;
    if (!canManageAgent(auth.membershipRole)) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }

    const supabase = auth.supabase;

    const rows = input.trades.map((trade) => {
      const executedAt = trade.executedAt ?? new Date().toISOString();
      const notionalUsd = trade.notionalUsd != null ? String(trade.notionalUsd) : null;
      const pnlUsd = trade.pnlUsd != null ? String(trade.pnlUsd) : undefined;
      const feesUsd = trade.feesUsd != null ? String(trade.feesUsd) : null;
      const pnlPercent =
        trade.pnlUsd != null && trade.notionalUsd != null && Number(trade.notionalUsd) > 0
          ? String((Number(trade.pnlUsd) / Number(trade.notionalUsd)) * 100)
          : null;
      const isWin = trade.pnlUsd != null ? Number(trade.pnlUsd) > 0 : null;

      return {
        org_id: auth.orgId,
        agent_id: agentId,
        agent_version_id: input.agentVersionId ?? null,
        executed_at: executedAt,
        side: trade.side ?? null,
        base_asset: trade.baseAsset ?? null,
        quote_asset: trade.quoteAsset ?? null,
        amount: trade.amount ?? null,
        notional_usd: notionalUsd,
        pnl_usd: pnlUsd,
        pnl_percent: pnlPercent,
        fees_usd: feesUsd,
        is_win: isWin,
        tx_hash: trade.txHash ?? null,
        idempotency_key: trade.idempotencyKey,
        request_id: auth.correlationId,
        venue: trade.venue ?? null,
        wallet_address: trade.walletAddress ?? null,
        chain_id: trade.chainId ?? null,
        balance_pre: trade.balancePre ?? null,
        balance_post: trade.balancePost ?? null,
        fees_breakdown: trade.feesBreakdown ?? null,
        metadata: trade.metadata ?? {},
      };
    });

    const { error } = await supabase.from("agent_trade").upsert(rows, {
      onConflict: "org_id,idempotency_key",
    });
    if (error) {
      return createErrorResponse(new Error(error.message), { status: 400, customMessage: "Backfill failed" });
    }

    return createSuccessResponse(
      { ok: true, inserted: rows.length },
      { status: 200, headers: { "X-Correlation-Id": auth.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
