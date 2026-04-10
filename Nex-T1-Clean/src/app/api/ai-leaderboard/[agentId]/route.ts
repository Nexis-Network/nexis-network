export const maxDuration = 15;

import { connection, NextRequest } from "next/server";

import {
  createCompositeRateLimitKey,
  createErrorResponse,
  createRateLimitResponse,
  createSuccessResponse,
  extractClientIP,
  getOrCreateCorrelationId,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { getOrSet } from "@/server/services/redis/cache";
import {
  buildPlaceholderAgentDetail,
  isPlaceholderAgentId,
} from "@/modules/ai/leaderboard-placeholders";

const RANGE_TO_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

type RouteContext = { params: Promise<{ agentId: string }> };
type SeriesDetailRow = {
  bucket: UntypedJson;
  pnl_usd: UntypedJson;
  trades: UntypedJson;
  volume_usd?: UntypedJson;
  wins?: UntypedJson;
  losses?: UntypedJson;
};
type TradeDetailRow = {
  id: string;
  executed_at: string;
  side: string | null;
  base_asset: string | null;
  quote_asset: string | null;
  amount: UntypedJson;
  notional_usd: UntypedJson;
  pnl_usd: UntypedJson;
  fees_usd: UntypedJson;
  tx_hash: string | null;
  idempotency_key: string | null;
  venue: string | null;
  wallet_address: string | null;
  chain_id: UntypedJson;
  cumulative_pnl_usd: UntypedJson;
  cumulative_return_percent: UntypedJson;
};

class AgentDetailApiError extends Error {
  readonly status: number;
  readonly clientMessage: string;

  constructor(options: {
    message: string;
    status: number;
    clientMessage: string;
  }) {
    super(options.message);
    this.status = options.status;
    this.clientMessage = options.clientMessage;
  }
}

function toNumber(value: UntypedJson): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoBucket(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toISOString?: UntypedJson }).toISOString === "function"
  ) {
    try {
      return (value as { toISOString: () => string }).toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  await connection();
  return timeApiRoute("ai-leaderboard.agent.GET", async () => {
    const correlationId = getOrCreateCorrelationId(req);
    try {
      const { agentId } = await ctx.params;
      if (!agentId) {
        return createErrorResponse(new Error("agent_id_missing"), {
          status: 400,
          headers: { "X-Correlation-Id": correlationId },
        });
      }

      if (isPlaceholderAgentId(agentId)) {
        const rangeParam = new URL(req.url).searchParams.get("range") ?? "30d";
        const payload = buildPlaceholderAgentDetail({
          agentId,
          range: rangeParam,
        });
        const response = createSuccessResponse(payload, {
          headers: {
            "X-Correlation-Id": correlationId,
            "X-Leaderboard-Placeholder": "1",
          },
        });
        response.headers.set("Cache-Control", "no-store");
        return response;
      }

      const accessResult = await resolveAgentAccess(req, agentId, {
        allowPublic: true,
        requireMembership: false,
      });
      if (!accessResult.ok) return accessResult.response;
      const { access } = accessResult;
      const supabase = access.service;

      const rateKey = createCompositeRateLimitKey({
        clientIP: extractClientIP(req),
        route: "ai-leaderboard-agent",
        orgId: access.agent.orgId,
        userId: access.userId,
      });
      const rateLimitResult = await handleRequestRateLimitWithKey(rateKey);
      if (!rateLimitResult.success) {
        return createRateLimitResponse({
          ...rateLimitResult.errorResponse,
          headers: {
            ...rateLimitResult.errorResponse.headers,
            "X-Correlation-Id": correlationId,
          },
        });
      }

      const rangeParam = new URL(req.url).searchParams.get("range") ?? "30d";
      const lookbackDays = RANGE_TO_DAYS[rangeParam] ?? 30;
      const sinceIso = new Date(
        Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const redacted = access.shouldRedactConfig;

      const cacheUser = access.userId ?? "anon";
      const cacheKey = `ai_leaderboard:agent:${access.agent.orgId}:${agentId}:${cacheUser}:${access.membershipRole}:${rangeParam}:${redacted ? "redacted" : "full"}`;

      const computePayload = async () => {
        const { data: seriesRows, error: seriesError } = await supabase
          .from("agent_performance_series")
          .select(
            redacted
              ? "bucket,pnl_usd,trades"
              : "bucket,pnl_usd,volume_usd,wins,losses,trades",
          )
          .eq("org_id", access.agent.orgId)
          .eq("agent_id", agentId)
          .gte("bucket", sinceIso)
          .order("bucket", { ascending: true })
          .limit(180);

        if (seriesError) {
          throw new AgentDetailApiError({
            message: seriesError.message,
            status: 400,
            clientMessage: "Failed to load series",
          });
        }

        let cumulativePnl = 0;
        const curve = ((seriesRows ?? []) as unknown as SeriesDetailRow[])
          .map((row) => {
            const bucket = toIsoBucket(row?.bucket);
            if (!bucket) return null;
            cumulativePnl += toNumber(row.pnl_usd) ?? 0;
            return {
              t: bucket,
              pnlUsd: cumulativePnl,
              dailyPnlUsd: toNumber(row.pnl_usd) ?? 0,
              trades: typeof row.trades === "number" ? row.trades : 0,
              ...(redacted
                ? {}
                : {
                    volumeUsd: toNumber(row.volume_usd),
                    wins: typeof row.wins === "number" ? row.wins : 0,
                    losses: typeof row.losses === "number" ? row.losses : 0,
                  }),
            };
          })
          .filter((point): point is NonNullable<typeof point> =>
            Boolean(point),
          );

        const { data: tradeRows, error: tradeError } = await supabase
          .from("agent_trade")
          .select(
            "id,executed_at,side,base_asset,quote_asset,amount,notional_usd,pnl_usd,fees_usd,tx_hash,idempotency_key,venue,wallet_address,chain_id,cumulative_pnl_usd,cumulative_return_percent",
          )
          .eq("org_id", access.agent.orgId)
          .eq("agent_id", agentId)
          .order("executed_at", { ascending: false })
          .limit(250);

        if (tradeError) {
          throw new AgentDetailApiError({
            message: tradeError.message,
            status: 400,
            clientMessage: "Failed to load trades",
          });
        }

        const trades = ((tradeRows ?? []) as TradeDetailRow[]).map((row) => {
          if (!redacted) {
            return {
              id: row.id,
              executedAt: row.executed_at,
              side: row.side ?? null,
              baseAsset: row.base_asset ?? null,
              quoteAsset: row.quote_asset ?? null,
              amount: row.amount != null ? String(row.amount) : null,
              notionalUsd: toNumber(row.notional_usd),
              pnlUsd: toNumber(row.pnl_usd),
              feesUsd: toNumber(row.fees_usd),
              cumulativePnlUsd: toNumber(row.cumulative_pnl_usd),
              cumulativeReturnPercent: toNumber(row.cumulative_return_percent),
              txHash: row.tx_hash ?? null,
              idempotencyKey: row.idempotency_key ?? null,
              venue: row.venue ?? null,
              walletAddress: row.wallet_address ?? null,
              chainId: typeof row.chain_id === "number" ? row.chain_id : null,
            };
          }

          return {
            id: row.id,
            executedAt: row.executed_at,
            side: null,
            baseAsset: null,
            quoteAsset: null,
            amount: null,
            notionalUsd: null,
            pnlUsd: toNumber(row.pnl_usd),
            feesUsd: toNumber(row.fees_usd),
            cumulativePnlUsd: toNumber(row.cumulative_pnl_usd),
            cumulativeReturnPercent: toNumber(row.cumulative_return_percent),
            txHash: null,
            idempotencyKey: null,
            venue: row.venue ?? null,
            walletAddress: null,
            chainId: null,
          };
        });

        return {
          ok: true,
          agentId,
          orgId: access.agent.orgId,
          range: rangeParam,
          since: sinceIso,
          redacted,
          curve,
          trades,
        };
      };

      const payload =
        process.env.NODE_ENV === "test"
          ? await computePayload()
          : await getOrSet(cacheKey, computePayload, {
              ttlSeconds: 30,
              staleTtlSeconds: 120,
              coalesce: true,
              namespace: "ai_leaderboard",
            });

      const response = createSuccessResponse(payload, {
        headers: { "X-Correlation-Id": correlationId },
      });
      response.headers.set(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=120",
      );
      return response;
    } catch (error) {
      if (error instanceof AgentDetailApiError) {
        return createErrorResponse(error, {
          status: error.status,
          customMessage: error.clientMessage,
          headers: { "X-Correlation-Id": correlationId },
        });
      }

      if (process.env.NODE_ENV !== "production") {
        const agentId = (await ctx.params).agentId;
        if (agentId && isPlaceholderAgentId(agentId)) {
          const rangeParam =
            new URL(req.url).searchParams.get("range") ?? "30d";
          const payload = buildPlaceholderAgentDetail({
            agentId,
            range: rangeParam,
          });
          return createSuccessResponse(payload, {
            headers: {
              "X-Correlation-Id": correlationId,
              "X-Leaderboard-Placeholder": "1",
            },
          });
        }
      }
      return createErrorResponse(error, {
        headers: { "X-Correlation-Id": correlationId },
      });
    }
  });
}
