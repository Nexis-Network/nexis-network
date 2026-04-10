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
import { canViewPrivateAgentConfig, shouldRedactAgentConfig } from "@/server/agents/access";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { withAuth } from "@/server/security/with-auth";
import { createClient as createSupabase } from "@/server/services/supabase/server";
import { buildPlaceholderLeaderboardPayload } from "@/modules/ai/leaderboard-placeholders";
import { getOrSet } from "@/server/services/redis/cache";
import { commitActiveOrgCookies, ensureActiveOrg } from "@/server/organization/active-org";
import type { OrgMemberRole } from "@/server/api/helpers/with-agent-auth";

import type { RankingSortBy, RankingTimeframe } from "@/types/ai-leaderboard";

import { logger } from '@/lib/logger';
const RANGE_TO_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/* -------------------------------------------------------------------------- */
/*  Arena rankings types & helpers (multi-dimensional view)                    */
/* -------------------------------------------------------------------------- */

const VALID_SORT_BY = new Set<RankingSortBy>(["pnl", "roi", "winrate", "sharpe", "volume", "aum"]);
const VALID_TIMEFRAME = new Set<RankingTimeframe>(["all", "7d", "30d"]);

const SORT_BY_TO_RANK_COLUMN: Record<RankingSortBy, string> = {
  pnl: "rank_by_pnl",
  roi: "rank_by_roi",
  winrate: "rank_by_winrate",
  sharpe: "rank_by_sharpe",
  volume: "rank_by_volume",
  aum: "rank_by_aum",
};

function parseSortBy(value: string | null): RankingSortBy {
  if (value && VALID_SORT_BY.has(value as RankingSortBy)) return value as RankingSortBy;
  return "pnl";
}

function parseTimeframe(value: string | null): RankingTimeframe {
  if (value && VALID_TIMEFRAME.has(value as RankingTimeframe)) return value as RankingTimeframe;
  return "all";
}

type ArenaRankingRow = {
  agent_id: string;
  org_id: string;
  /** View column is `name` (not `agent_name`) */
  name: string;
  /** View column is `slug` (not `agent_slug`) */
  slug: string;
  visibility: string;
  realized_pnl_usd: string | number | null;
  volume_usd: string | number | null;
  total_trades: number | null;
  win_rate_percent: string | number | null;
  total_pnl_usd: string | number | null;
  roi_percent: string | number | null;
  sharpe_ratio: string | number | null;
  sortino_ratio: string | number | null;
  max_drawdown_percent: string | number | null;
  aum_usd: string | number | null;
  rank_by_pnl: number | null;
  rank_by_roi: number | null;
  rank_by_winrate: number | null;
  rank_by_sharpe: number | null;
  rank_by_volume: number | null;
  rank_by_aum: number | null;
};

type AgentRow = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private" | "unlisted";
  owner_user_id: string | null;
};

type PerfRow = {
  agent_id: string;
  realized_pnl_usd: string | number | null;
  win_rate_percent: string | number | null;
  total_trades: number | null;
  wins: number | null;
  losses: number | null;
  average_return_percent: string | number | null;
  last_trade_at: string | null;
};

type SeriesRow = {
  agent_id: string;
  bucket: UntypedJson;
  pnl_usd: string | number | null;
  trades: number | null;
};

type NormalizedSeriesRow = Omit<SeriesRow, "bucket"> & { bucket: string };

type TradeRow = {
  id: string;
  agent_id: string;
  executed_at: string;
  side: string | null;
  base_asset: string | null;
  quote_asset: string | null;
  amount: string | null;
  notional_usd: string | number | null;
  pnl_usd: string | number | null;
  fees_usd: string | number | null;
  tx_hash: string | null;
  idempotency_key: string | null;
  venue: string | null;
  wallet_address: string | null;
  chain_id: number | null;
  cumulative_pnl_usd: string | number | null;
  cumulative_return_percent: string | number | null;
};

class LeaderboardApiError extends Error {
  readonly status: number;
  readonly clientMessage: string;

  constructor(options: { message: string; status: number; clientMessage: string }) {
    super(options.message);
    this.status = options.status;
    this.clientMessage = options.clientMessage;
  }
}

function normalizeOrgMemberRole(value: UntypedJson): OrgMemberRole {
  switch (value) {
    case "owner":
    case "admin":
    case "manager":
    case "viewer":
      return value;
    default:
      return "viewer";
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

function toInt(value: UntypedJson): number | null {
  const num = toNumber(value);
  if (num == null) return null;
  return Number.isFinite(num) ? Math.trunc(num) : null;
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

  if (value && typeof value === "object" && typeof (value as { toISOString?: UntypedJson }).toISOString === "function") {
    try {
      return (value as { toISOString: () => string }).toISOString();
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  await connection();
  return timeApiRoute("ai-leaderboard.GET", async () => {
    const correlationId = getOrCreateCorrelationId(req);
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") ?? "30d";
    const topRaw = Number(url.searchParams.get("top") ?? "10");
    const requestedTop = Number.isFinite(topRaw) ? Math.max(1, Math.min(25, topRaw)) : 10;

    let orgResolution: Awaited<ReturnType<typeof ensureActiveOrg>> | null = null;

    const withOrgCookies = (response: Response): Response =>
      orgResolution ? commitActiveOrgCookies(orgResolution, response) : response;

    const respondWithPlaceholders = (reason: string, orgId: string | null) => {
      const payload = buildPlaceholderLeaderboardPayload({ range: rangeParam, orgId, placeholderReason: reason });
      const response = createSuccessResponse(payload, {
        headers: {
          "X-Correlation-Id": correlationId,
          "X-Leaderboard-Placeholder": "1",
          "X-Leaderboard-Placeholder-Reason": reason,
        },
      });
      response.headers.set("Cache-Control", "no-store");
      return withOrgCookies(response);
    };

    try {
      const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
      if (!auth.ok) {
        auth.response.headers.set("X-Correlation-Id", correlationId);
        return auth.response;
      }

      orgResolution = auth.orgId ? null : await ensureActiveOrg({ cookieSource: req.cookies });
      if (orgResolution && !orgResolution.ok) {
        orgResolution.response.headers.set("X-Correlation-Id", correlationId);
        return orgResolution.response;
      }

      const orgId = auth.orgId ?? orgResolution?.orgId ?? null;

      const rateKey = createCompositeRateLimitKey({
        clientIP: extractClientIP(req),
        route: "ai-leaderboard",
        orgId,
        userId: auth.session?.user.id ?? null,
      });
      const rateLimitResult = await handleRequestRateLimitWithKey(rateKey);
      if (!rateLimitResult.success) {
        return withOrgCookies(createRateLimitResponse({
          ...rateLimitResult.errorResponse,
          headers: { ...rateLimitResult.errorResponse.headers, "X-Correlation-Id": correlationId },
        }));
      }

      const supabase = await createSupabase();
      if (!orgId || !supabase) {
        return respondWithPlaceholders(!orgId ? "org_missing" : "supabase_not_configured", orgId ?? null);
      }

      /* ------------------------------------------------------------------ */
      /*  MODE: rankings — multi-dimensional agent_arena_rankings view       */
      /* ------------------------------------------------------------------ */
      if (url.searchParams.get("mode") === "rankings") {
        const sortBy = parseSortBy(url.searchParams.get("sortBy"));
        const timeframe = parseTimeframe(url.searchParams.get("timeframe"));
        const limitRaw = Number(url.searchParams.get("limit") ?? "50");
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
        const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
        const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

        const rankColumn = SORT_BY_TO_RANK_COLUMN[sortBy];
        const rankingsCacheKey = `ai_leaderboard:rankings:${orgId}:${sortBy}:${timeframe}:${limit}:${offset}`;

        const computeRankings = async () => {
          let query = supabase
            .from("agent_arena_rankings")
            .select(
              "agent_id,org_id,name,slug,visibility," +
              "realized_pnl_usd,volume_usd,total_trades," +
              "win_rate_percent," +
              "total_pnl_usd," +
              "roi_percent,sharpe_ratio,sortino_ratio," +
              "max_drawdown_percent,aum_usd," +
              "rank_by_pnl,rank_by_roi,rank_by_winrate,rank_by_sharpe,rank_by_volume,rank_by_aum",
              { count: "exact" },
            )
            .eq("org_id", orgId)
            .order(rankColumn, { ascending: true })
            .range(offset, offset + limit - 1);

          // Timeframe filtering: the view includes all-time data, so for 7d/30d
          // we would need to filter on a date column if available. Since the view
          // is aggregate, we pass the timeframe for informational purposes and
          // let the view handle the default (all-time) aggregation.
          // Future: add timeframe-aware views or RPC.

          const { data: rows, error: rankingsError, count } = await query;

          if (rankingsError) {
            logger.error("[Rankings] Failed to query agent_arena_rankings:", rankingsError);
            throw new LeaderboardApiError({
              message: rankingsError.message,
              status: 400,
              clientMessage: "Failed to load arena rankings",
            });
          }

          const rawRows = (rows ?? []) as unknown as ArenaRankingRow[];
          const agents = rawRows.map((row) => ({
            agentId: row.agent_id,
            orgId: row.org_id,
            agentName: row.name,
            agentSlug: row.slug,
            visibility: row.visibility as "public" | "private" | "unlisted",
            avatarUrl: null as string | null,

            realizedPnlUsd: toNumber(row.realized_pnl_usd) ?? 0,
            volumeUsd: toNumber(row.volume_usd) ?? 0,
            totalTrades: toInt(row.total_trades) ?? 0,
            wins: 0,
            losses: 0,
            winRatePercent: toNumber(row.win_rate_percent),
            averageReturnPercent: null as number | null,

            portfolioValueUsd: 0,
            unrealizedPnlUsd: 0,
            totalPnlUsd: toNumber(row.total_pnl_usd) ?? 0,
            roiPercent: toNumber(row.roi_percent),
            sharpeRatio: toNumber(row.sharpe_ratio),
            sortinoRatio: toNumber(row.sortino_ratio),
            maxDrawdownPercent: toNumber(row.max_drawdown_percent),
            aumUsd: toNumber(row.aum_usd) ?? 0,

            pnlRank: toInt(row.rank_by_pnl) ?? 0,
            roiRank: toInt(row.rank_by_roi) ?? 0,
            winrateRank: toInt(row.rank_by_winrate) ?? 0,
            sharpeRank: toInt(row.rank_by_sharpe) ?? 0,
            volumeRank: toInt(row.rank_by_volume) ?? 0,
            aumRank: toInt(row.rank_by_aum) ?? 0,
          }));

          return {
            ok: true as const,
            sortBy,
            timeframe,
            limit,
            offset,
            total: count ?? agents.length,
            agents,
          };
        };

        const rankingsPayload =
          process.env.NODE_ENV === "test"
            ? await computeRankings()
            : await getOrSet(rankingsCacheKey, computeRankings, {
                ttlSeconds: 30,
                staleTtlSeconds: 120,
                coalesce: true,
                namespace: "ai_leaderboard",
              });

        const response = createSuccessResponse(rankingsPayload, {
          headers: { "X-Correlation-Id": correlationId },
        });
        response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
        return withOrgCookies(response);
      }

      /* ------------------------------------------------------------------ */
      /*  MODE: default — existing leaderboard (P&L sorted)                  */
      /* ------------------------------------------------------------------ */
      const lookbackDays = RANGE_TO_DAYS[rangeParam] ?? 30;
      const top = requestedTop;
      const sinceIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

      const userId = auth.session?.user?.id ?? null;
      const membershipRole: OrgMemberRole = await (async () => {
        if (!userId) return "viewer";
        const { data, error } = await supabase
          .from("org_member")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return "viewer";
        return normalizeOrgMemberRole(data?.role);
      })();

      const cacheKey = `ai_leaderboard:summary:${orgId}:${userId ?? "anon"}:${membershipRole}:${rangeParam}:${top}`;

      const computePayload = async () => {
        const { data: agentRows, error: agentsError } = await supabase
          .from("agent")
          .select("id,slug,name,visibility,owner_user_id")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(250);

        if (agentsError) {
          logger.error("[Leaderboard] Failed to load agents:", agentsError); // Debug RLS/Schema
          throw new LeaderboardApiError({
            message: agentsError.message,
            status: 400,
            clientMessage: "Failed to load agents",
          });
        }

        const agents = (agentRows ?? []) as AgentRow[];
        if (agents.length === 0) {
          return buildPlaceholderLeaderboardPayload({ range: rangeParam, orgId, placeholderReason: "no_agents" });
        }

        const agentIds = agents.map((row) => row.id);

        const { data: perfRows, error: perfError } = await supabase
          .from("agent_performance_summary")
          .select(
            "agent_id,realized_pnl_usd,win_rate_percent,total_trades,wins,losses,average_return_percent,last_trade_at",
          )
          .eq("org_id", orgId)
          .in("agent_id", agentIds);

        if (perfError) {
          throw new LeaderboardApiError({
            message: perfError.message,
            status: 400,
            clientMessage: "Failed to load agent performance",
          });
        }

        const perfByAgentId = new Map<string, PerfRow>();
        for (const row of (perfRows ?? []) as PerfRow[]) {
          if (row?.agent_id) perfByAgentId.set(row.agent_id, row);
        }

        const redactByAgentId = new Map<string, boolean>();
        for (const agent of agents) {
          const canViewPrivateConfig = userId
            ? canViewPrivateAgentConfig({
                userId,
                membershipRole,
                agentOwnerUserId: agent.owner_user_id,
              })
            : false;
          redactByAgentId.set(
            agent.id,
            shouldRedactAgentConfig({
              agentVisibility: agent.visibility,
              canViewPrivateConfig,
            }),
          );
        }

        const ranked = agents
          .map((agent) => {
            const perf = perfByAgentId.get(agent.id);
            const realizedPnlUsd = toNumber(perf?.realized_pnl_usd) ?? 0;
            const totalTrades = toInt(perf?.total_trades) ?? 0;
            const wins = toInt(perf?.wins) ?? 0;
            const losses = toInt(perf?.losses) ?? 0;
            const winRatePercent = toNumber(perf?.win_rate_percent);
            const averageReturnPercent = toNumber(perf?.average_return_percent);
            const redacted = redactByAgentId.get(agent.id) ?? false;

            return {
              id: agent.id,
              slug: agent.slug,
              name: agent.name,
              visibility: agent.visibility,
              redacted,
              performance: {
                realizedPnlUsd,
                winRatePercent,
                totalTrades,
                wins,
                losses,
                averageReturnPercent,
                lastTradeAt: typeof perf?.last_trade_at === "string" ? perf.last_trade_at : null,
              },
            };
          })
          .sort((a, b) => (b.performance.realizedPnlUsd ?? 0) - (a.performance.realizedPnlUsd ?? 0));

        const topAgents = ranked.slice(0, top);
        const topIds = topAgents.map((agent) => agent.id);

        // Parallelize series and trades queries
        const [seriesResult, tradeResult] = await Promise.all([
          supabase
            .from("agent_performance_series")
            .select("agent_id,bucket,pnl_usd,trades")
            .eq("org_id", orgId)
            .in("agent_id", topIds)
            .gte("bucket", sinceIso)
            .order("bucket", { ascending: true })
            .limit(2000),
          supabase
            .from("agent_trade")
            .select(
              "id,agent_id,executed_at,side,base_asset,quote_asset,amount,notional_usd,pnl_usd,fees_usd,tx_hash,idempotency_key,venue,wallet_address,chain_id,cumulative_pnl_usd,cumulative_return_percent",
            )
            .eq("org_id", orgId)
            .in("agent_id", topIds)
            .order("executed_at", { ascending: false })
            .limit(250),
        ]);

        const { data: seriesRows, error: seriesError } = seriesResult;
        const { data: tradeRows, error: tradeError } = tradeResult;

        if (seriesError) {
          throw new LeaderboardApiError({
            message: seriesError.message,
            status: 400,
            clientMessage: "Failed to load performance series",
          });
        }

        if (tradeError) {
          throw new LeaderboardApiError({
            message: tradeError.message,
            status: 400,
            clientMessage: "Failed to load trades",
          });
        }

        const seriesByAgent = new Map<string, NormalizedSeriesRow[]>();
        for (const row of (seriesRows ?? []) as SeriesRow[]) {
          const agentId = typeof row?.agent_id === "string" ? row.agent_id : null;
          const bucket = toIsoBucket(row?.bucket);
          if (!agentId || !bucket) continue;

          const list = seriesByAgent.get(agentId) ?? [];
          list.push({
            agent_id: agentId,
            bucket,
            pnl_usd: row?.pnl_usd ?? null,
            trades: row?.trades ?? null,
          });
          seriesByAgent.set(agentId, list);
        }

        const curves = topAgents
          .map((agent) => {
            const rows = (seriesByAgent.get(agent.id) ?? []).slice().sort((a, b) => a.bucket.localeCompare(b.bucket));
            let cumulativePnl = 0;
            const points = rows.map((row) => {
              cumulativePnl += toNumber(row.pnl_usd) ?? 0;
              return {
                t: row.bucket,
                pnlUsd: cumulativePnl,
                dailyPnlUsd: toNumber(row.pnl_usd) ?? 0,
                trades: toInt(row.trades) ?? 0,
              };
            });

            return {
              agentId: agent.id,
              name: agent.name,
              redacted: agent.redacted,
              points,
            };
          })
          .filter((curve) => curve.points.length > 0);

        const trades = ((tradeRows ?? []) as TradeRow[]).map((row) => {
          const redacted = redactByAgentId.get(row.agent_id) ?? false;
          if (!redacted) {
            return {
              id: row.id,
              agentId: row.agent_id,
              executedAt: row.executed_at,
              side: row.side,
              baseAsset: row.base_asset,
              quoteAsset: row.quote_asset,
              amount: row.amount,
              notionalUsd: toNumber(row.notional_usd),
              pnlUsd: toNumber(row.pnl_usd),
              feesUsd: toNumber(row.fees_usd),
              cumulativePnlUsd: toNumber(row.cumulative_pnl_usd),
              cumulativeReturnPercent: toNumber(row.cumulative_return_percent),
              txHash: row.tx_hash,
              idempotencyKey: row.idempotency_key,
              venue: row.venue,
              walletAddress: row.wallet_address,
              chainId: row.chain_id,
            };
          }

          return {
            id: row.id,
            agentId: row.agent_id,
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
            venue: row.venue,
            walletAddress: null,
            chainId: null,
          };
        });

        return {
          ok: true,
          orgId,
          range: rangeParam,
          top,
          since: sinceIso,
          agents: topAgents,
          curves,
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

      const payloadMeta = payload as { placeholder?: UntypedJson; placeholderReason?: UntypedJson };
      const placeholderReason = typeof payloadMeta.placeholderReason === "string" ? payloadMeta.placeholderReason : null;
      if (payloadMeta.placeholder === true) {
        return respondWithPlaceholders(placeholderReason ?? "no_agents", orgId);
      }

      let response = createSuccessResponse(payload, { headers: { "X-Correlation-Id": correlationId } });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
      return withOrgCookies(response);
    } catch (error) {
      if (error instanceof LeaderboardApiError) {
        return withOrgCookies(createErrorResponse(error, {
          status: error.status,
          customMessage: error.clientMessage,
          headers: { "X-Correlation-Id": correlationId },
        }));
      }
      if (process.env.NODE_ENV !== "production") {
        return respondWithPlaceholders("uncaught_exception", null);
      }
      return withOrgCookies(createErrorResponse(error, { headers: { "X-Correlation-Id": correlationId } }));
    }
  });
}
