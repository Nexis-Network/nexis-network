"use client";

import { useQuery, keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import type {
  AgentDetailPayload,
  ArenaRankingsPayload,
  LeaderboardPayload,
  RangeOption,
  RankingSortBy,
  RankingTimeframe,
} from "@/types/ai-leaderboard";


import { logger } from '@/lib/logger';
const rangeSchema = z.enum(["7d", "30d", "90d"]);

const agentPerformanceSchema = z.object({
  realizedPnlUsd: z.number().finite(),
  winRatePercent: z.number().finite().nullable(),
  totalTrades: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  averageReturnPercent: z.number().finite().nullable(),
  lastTradeAt: z.string().nullable(),
});

const agentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  visibility: z.enum(["public", "private", "unlisted"]),
  redacted: z.boolean(),
  performance: agentPerformanceSchema,
});

const curvePointSchema = z.object({
  t: z.string(),
  pnlUsd: z.number().finite(),
  dailyPnlUsd: z.number().finite(),
  trades: z.number().int().nonnegative(),
});

const curveSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  redacted: z.boolean(),
  points: z.array(curvePointSchema),
});

const leaderboardTradeSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  executedAt: z.string(),
  venue: z.string().nullable(),
  side: z.string().nullable(),
  baseAsset: z.string().nullable(),
  quoteAsset: z.string().nullable(),
  amount: z.string().nullable(),
  notionalUsd: z.number().finite().nullable(),
  pnlUsd: z.number().finite().nullable(),
  feesUsd: z.number().finite().nullable(),
  cumulativePnlUsd: z.number().finite().nullable(),
  cumulativeReturnPercent: z.number().finite().nullable(),
  txHash: z.string().nullable(),
  chainId: z.number().int().nullable(),
});

const leaderboardPayloadSchema = z
  .object({
    ok: z.literal(true),
    placeholder: z.boolean().optional(),
    placeholderReason: z.string().optional(),
    range: rangeSchema,
    top: z.number().int().positive(),
    since: z.string(),
    agents: z.array(agentSchema),
    curves: z.array(curveSchema),
    trades: z.array(leaderboardTradeSchema),
  })
  .passthrough();

const agentTradeSchema = leaderboardTradeSchema.omit({ agentId: true }).passthrough();

const agentCurvePointSchema = z
  .object({
    t: z.string(),
    pnlUsd: z.number().finite(),
    dailyPnlUsd: z.number().finite(),
    trades: z.number().int().nonnegative(),
    volumeUsd: z.number().finite().nullable().optional(),
    wins: z.number().int().nonnegative().optional(),
    losses: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const agentDetailPayloadSchema = z
  .object({
    ok: z.literal(true),
    placeholder: z.boolean().optional(),
    placeholderReason: z.string().optional(),
    agentId: z.string(),
    range: rangeSchema,
    since: z.string(),
    redacted: z.boolean(),
    curve: z.array(agentCurvePointSchema),
    trades: z.array(agentTradeSchema),
  })
  .passthrough();

async function parseApiErrorMessage(
  response: Response,
  options: { fallback: string; includeDetailsPrefix?: boolean },
): Promise<string> {
  const body = await response.text();
  let message = body || options.fallback;

  try {
    const json = JSON.parse(body);
    if (options.includeDetailsPrefix) {
      message =
        typeof json?.details === "string" && json.details.length > 0
          ? `${json?.error ?? "Request failed"}: ${json.details}`
          : String(json?.error ?? options.fallback);
    } else {
      message = String(json?.error ?? json?.details ?? options.fallback);
    }
  } catch {
    // ignore invalid json and fall back to raw body
  }

  return message;
}

export async function fetchAiLeaderboard(
  params: { range: RangeOption; top?: number },
  options?: { signal?: AbortSignal },
): Promise<LeaderboardPayload> {
  const top = params.top ?? 10;
  const response = await fetch(`/api/ai-leaderboard?range=${params.range}&top=${top}`, {
    method: "GET",
    credentials: "include",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(
      await parseApiErrorMessage(response, { fallback: "Failed to load leaderboard", includeDetailsPrefix: true }),
    );
  }

  const data = await response.json();
  const parsed = leaderboardPayloadSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("ai_leaderboard: unable to parse response", parsed.error.flatten());
    throw new Error("Leaderboard response is malformed");
  }

  return parsed.data as LeaderboardPayload;
}

export async function fetchAiLeaderboardAgentDetail(
  params: { agentId: string; range: RangeOption },
  options?: { signal?: AbortSignal },
): Promise<AgentDetailPayload> {
  const response = await fetch(`/api/ai-leaderboard/${params.agentId}?range=${params.range}`, {
    method: "GET",
    credentials: "include",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, { fallback: "Failed to load agent detail" }));
  }

  const data = await response.json();
  const parsed = agentDetailPayloadSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("ai_leaderboard_detail: unable to parse response", parsed.error.flatten());
    throw new Error("Agent detail response is malformed");
  }

  return parsed.data as AgentDetailPayload;
}

export function useAiLeaderboardQuery(params: {
  range: RangeOption;
  top?: number;
}): UseQueryResult<LeaderboardPayload> {
  const top = params.top ?? 10;

  return useQuery({
    queryKey: ["ai-leaderboard", "summary", params.range, top],
    queryFn: ({ signal }) => fetchAiLeaderboard({ range: params.range, top }, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.error ? false : query.state.data?.placeholder ? 15_000 : false),
    refetchIntervalInBackground: false,
  });
}

export function useAiLeaderboardAgentDetailQuery(params: {
  agentId: string | null;
  range: RangeOption;
}): UseQueryResult<AgentDetailPayload> {
  return useQuery({
    queryKey: ["ai-leaderboard", "agent", params.agentId, params.range],
    queryFn: ({ signal }) =>
      fetchAiLeaderboardAgentDetail({ agentId: params.agentId!, range: params.range }, { signal }),
    enabled: Boolean(params.agentId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

/* -------------------------------------------------------------------------- */
/*  Multi-dimensional arena rankings                                          */
/* -------------------------------------------------------------------------- */

const rankingSortBySchema = z.enum(["pnl", "roi", "winrate", "sharpe", "volume", "aum"]);
const rankingTimeframeSchema = z.enum(["all", "7d", "30d"]);

const arenaRankingAgentSchema = z.object({
  agentId: z.string(),
  orgId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  visibility: z.enum(["public", "private", "unlisted"]),
  avatarUrl: z.string().nullable(),

  realizedPnlUsd: z.number().finite(),
  volumeUsd: z.number().finite(),
  totalTrades: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  winRatePercent: z.number().finite().nullable(),
  averageReturnPercent: z.number().finite().nullable(),

  portfolioValueUsd: z.number().finite(),
  unrealizedPnlUsd: z.number().finite(),
  totalPnlUsd: z.number().finite(),
  roiPercent: z.number().finite().nullable(),
  sharpeRatio: z.number().finite().nullable(),
  sortinoRatio: z.number().finite().nullable(),
  maxDrawdownPercent: z.number().finite().nullable(),
  aumUsd: z.number().finite(),

  pnlRank: z.number().int().nonnegative(),
  roiRank: z.number().int().nonnegative(),
  winrateRank: z.number().int().nonnegative(),
  sharpeRank: z.number().int().nonnegative(),
  volumeRank: z.number().int().nonnegative(),
  aumRank: z.number().int().nonnegative(),
});

const arenaRankingsPayloadSchema = z
  .object({
    ok: z.literal(true),
    sortBy: rankingSortBySchema,
    timeframe: rankingTimeframeSchema,
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    agents: z.array(arenaRankingAgentSchema),
  })
  .passthrough();

export async function fetchArenaRankings(
  params: {
    sortBy?: RankingSortBy;
    timeframe?: RankingTimeframe;
    limit?: number;
    offset?: number;
  },
  options?: { signal?: AbortSignal },
): Promise<ArenaRankingsPayload> {
  const searchParams = new URLSearchParams();
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.timeframe) searchParams.set("timeframe", params.timeframe);
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.offset != null) searchParams.set("offset", String(params.offset));

  const response = await fetch(`/api/ai-leaderboard?mode=rankings&${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(
      await parseApiErrorMessage(response, { fallback: "Failed to load arena rankings", includeDetailsPrefix: true }),
    );
  }

  const data = await response.json();
  const parsed = arenaRankingsPayloadSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("arena_rankings: unable to parse response", parsed.error.flatten());
    throw new Error("Arena rankings response is malformed");
  }

  return parsed.data as ArenaRankingsPayload;
}

export function useArenaRankingsQuery(params: {
  sortBy: RankingSortBy;
  timeframe: RankingTimeframe;
  limit?: number;
  offset?: number;
}): UseQueryResult<ArenaRankingsPayload> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  return useQuery({
    queryKey: ["ai-leaderboard", "rankings", params.sortBy, params.timeframe, limit, offset],
    queryFn: ({ signal }) =>
      fetchArenaRankings(
        { sortBy: params.sortBy, timeframe: params.timeframe, limit, offset },
        { signal },
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
