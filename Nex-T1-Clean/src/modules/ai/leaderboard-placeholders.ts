export const PLACEHOLDER_AGENT_ID_PREFIX = "placeholder-agent-";

export type LeaderboardRange = "7d" | "30d" | "90d";

type PlaceholderAgent = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private" | "unlisted";
  redacted: boolean;
  performance: {
    realizedPnlUsd: number;
    winRatePercent: number | null;
    totalTrades: number;
    wins: number;
    losses: number;
    averageReturnPercent: number | null;
    lastTradeAt: string | null;
  };
};

type PlaceholderCurvePoint = {
  t: string;
  pnlUsd: number;
  dailyPnlUsd: number;
  trades: number;
};

type PlaceholderCurve = {
  agentId: string;
  name: string;
  redacted: boolean;
  points: PlaceholderCurvePoint[];
};

type PlaceholderTrade = {
  id: string;
  agentId: string;
  executedAt: string;
  venue: string | null;
  side: string | null;
  baseAsset: string | null;
  quoteAsset: string | null;
  amount: string | null;
  notionalUsd: number | null;
  pnlUsd: number | null;
  feesUsd: number | null;
  cumulativePnlUsd: number | null;
  cumulativeReturnPercent: number | null;
  txHash: string | null;
  chainId: number | null;
};

const RANGE_TO_DAYS: Record<LeaderboardRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const PLACEHOLDER_META = [
  { name: "Nex Alpha Scout", slug: "nex-alpha-scout" },
  { name: "Liquidity Sniper", slug: "liquidity-sniper" },
  { name: "Risk Parity Runner", slug: "risk-parity-runner" },
  { name: "Arb Seeker", slug: "arb-seeker" },
  { name: "Macro Sentinel", slug: "macro-sentinel" },
  { name: "Meme Momentum", slug: "meme-momentum" },
] as const;

const TRADE_PAIRS = [
  { base: "ETH", quote: "USDC" },
  { base: "WETH", quote: "USDC" },
  { base: "SOL", quote: "USDC" },
  { base: "WBTC", quote: "USDC" },
  { base: "ARB", quote: "USDC" },
  { base: "DEGEN", quote: "USDC" },
] as const;

const TRADE_VENUES = ["uniswap", "aerodrome", "1inch", "cow-swap"] as const;
const TRADE_CHAINS = [8453, 42161, 1, 137, 10, 43114] as const;

export function isPlaceholderAgentId(agentId: string): boolean {
  return agentId.startsWith(PLACEHOLDER_AGENT_ID_PREFIX);
}

export function normalizeLeaderboardRange(value: string | null | undefined): LeaderboardRange {
  switch (value) {
    case "7d":
    case "30d":
    case "90d":
      return value;
    default:
      return "30d";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function seededDailyPnl(seed: number, dayIndex: number): number {
  // Deterministic, non-random placeholder series.
  const wave =
    Math.sin((dayIndex + 1) * (0.42 + seed * 0.03)) * 120 +
    Math.cos((dayIndex + 4) * (0.27 + seed * 0.02)) * 75 +
    (seed - 2.5) * 18;
  return round(clamp(wave, -260, 320), 2);
}

function buildBuckets(nowMs: number, lookbackDays: number): string[] {
  const start = new Date(nowMs - lookbackDays * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  const buckets: string[] = [];
  for (let i = 0; i <= lookbackDays; i += 1) {
    const t = new Date(start.getTime() + i * 24 * 60 * 60 * 1000).toISOString();
    buckets.push(t);
  }
  return buckets;
}

function buildPlaceholderCurves(range: LeaderboardRange, nowMs: number) {
  const lookbackDays = RANGE_TO_DAYS[range];
  const buckets = buildBuckets(nowMs, lookbackDays);

  const curves: PlaceholderCurve[] = [];
  const perfByAgentId = new Map<string, { realizedPnlUsd: number; totalTrades: number; lastTradeAt: string | null }>();

  for (const [index, meta] of PLACEHOLDER_META.entries()) {
    const agentId = `${PLACEHOLDER_AGENT_ID_PREFIX}${index + 1}`;
    let cumulative = 0;
    let totalTrades = 0;
    let lastTradeAt: string | null = null;

    const points = buckets.map((bucket, dayIndex) => {
      const daily = seededDailyPnl(index + 1, dayIndex);
      const trades = Math.max(0, Math.min(18, Math.round(Math.abs(daily) / 85) + (index % 3)));
      cumulative += daily;
      totalTrades += trades;
      if (trades > 0) {
        lastTradeAt = bucket;
      }
      return {
        t: bucket,
        pnlUsd: round(cumulative, 2),
        dailyPnlUsd: daily,
        trades,
      };
    });

    perfByAgentId.set(agentId, {
      realizedPnlUsd: round(cumulative, 2),
      totalTrades,
      lastTradeAt,
    });

    curves.push({
      agentId,
      name: meta.name,
      redacted: false,
      points,
    });
  }

  return { curves, perfByAgentId, buckets };
}

function buildPlaceholderTrades(nowMs: number): PlaceholderTrade[] {
  const trades: PlaceholderTrade[] = [];

  for (const [index] of PLACEHOLDER_META.entries()) {
    const agentId = `${PLACEHOLDER_AGENT_ID_PREFIX}${index + 1}`;
    const chainId = TRADE_CHAINS[index % TRADE_CHAINS.length] ?? 1;
    const venue = TRADE_VENUES[index % TRADE_VENUES.length] ?? "uniswap";
    const pair = TRADE_PAIRS[index % TRADE_PAIRS.length] ?? TRADE_PAIRS[0];

    for (let k = 0; k < 2; k += 1) {
      const executedAt = new Date(nowMs - (index * 9 + k * 6 + 2) * 60 * 60 * 1000).toISOString();
      const notional = 850 + index * 420 + k * 260;
      const pnl = round(((index % 2 === 0 ? 1 : -1) * (notional * (0.012 + k * 0.004))) + (k === 1 ? 18 : -6), 2);
      const fees = round(notional * 0.00065, 2);

      trades.push({
        id: `${agentId}-trade-${k + 1}`,
        agentId,
        executedAt,
        venue,
        side: k % 2 === 0 ? "buy" : "sell",
        baseAsset: pair.base,
        quoteAsset: pair.quote,
        amount: round((notional / (index % 2 === 0 ? 2400 : 1800)) * (k === 0 ? 1 : 0.65), 6).toString(),
        notionalUsd: round(notional, 2),
        pnlUsd: pnl,
        feesUsd: fees,
        cumulativePnlUsd: null,
        cumulativeReturnPercent: null,
        txHash: null,
        chainId,
      });
    }
  }

  return trades.sort((a, b) => b.executedAt.localeCompare(a.executedAt));
}

export function buildPlaceholderLeaderboardPayload(options: {
  range?: string | null;
  nowMs?: number;
  orgId?: string | null;
  placeholderReason?: string | null;
}) {
  const range = normalizeLeaderboardRange(options.range);
  const nowMs = typeof options.nowMs === "number" ? options.nowMs : Date.now();
  const { curves, perfByAgentId } = buildPlaceholderCurves(range, nowMs);
  const trades = buildPlaceholderTrades(nowMs);

  const agents: PlaceholderAgent[] = PLACEHOLDER_META.map((meta, index): PlaceholderAgent => {
    const id = `${PLACEHOLDER_AGENT_ID_PREFIX}${index + 1}`;
    const perf = perfByAgentId.get(id);
    const realizedPnlUsd = perf?.realizedPnlUsd ?? 0;
    const totalTrades = perf?.totalTrades ?? 0;
    const winRate = clamp(0.52 + Math.sin((index + 1) * 0.9) * 0.09, 0.34, 0.74);
    const wins = totalTrades > 0 ? Math.round(totalTrades * winRate) : 0;
    const losses = totalTrades > 0 ? Math.max(0, totalTrades - wins) : 0;
    const winRatePercent = totalTrades > 0 ? round((wins / totalTrades) * 100, 2) : null;
    const averageReturnPercent = totalTrades > 0 ? round(clamp(realizedPnlUsd / 420, -18, 28), 2) : null;

    return {
      id,
      slug: meta.slug,
      name: meta.name,
      visibility: "public",
      redacted: false,
      performance: {
        realizedPnlUsd,
        winRatePercent,
        totalTrades,
        wins,
        losses,
        averageReturnPercent,
        lastTradeAt: perf?.lastTradeAt ?? null,
      },
    };
  }).sort((a, b) => (b.performance.realizedPnlUsd ?? 0) - (a.performance.realizedPnlUsd ?? 0));

  const top = agents.length;
  const since = new Date(nowMs - RANGE_TO_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();

  return {
    ok: true as const,
    placeholder: true as const,
    placeholderReason: options.placeholderReason ?? undefined,
    orgId: options.orgId ?? null,
    range,
    top,
    since,
    agents,
    curves,
    trades,
  };
}

export function buildPlaceholderAgentDetail(options: {
  agentId: string;
  range?: string | null;
  nowMs?: number;
}) {
  const range = normalizeLeaderboardRange(options.range);
  const nowMs = typeof options.nowMs === "number" ? options.nowMs : Date.now();
  const { curves } = buildPlaceholderCurves(range, nowMs);
  const curve = curves.find((entry) => entry.agentId === options.agentId)?.points ?? [];
  const trades = buildPlaceholderTrades(nowMs).filter((trade) => trade.agentId === options.agentId);

  return {
    ok: true as const,
    placeholder: true as const,
    agentId: options.agentId,
    range,
    since: new Date(nowMs - RANGE_TO_DAYS[range] * 24 * 60 * 60 * 1000).toISOString(),
    redacted: false,
    curve,
    trades,
  };
}
