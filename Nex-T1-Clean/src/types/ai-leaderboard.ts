export type RangeOption = "7d" | "30d" | "90d";
export type IntervalOption = "day" | "week" | "month";

/** Sort dimensions for the multi-dimensional arena rankings. */
export type RankingSortBy = "pnl" | "roi" | "winrate" | "sharpe" | "volume" | "aum";

/** Timeframe filter for arena rankings. */
export type RankingTimeframe = "all" | "7d" | "30d";

/** A single agent row from the `agent_arena_rankings` database view. */
export type ArenaRankingAgent = {
  agentId: string;
  orgId: string;
  agentName: string;
  agentSlug: string;
  visibility: "public" | "private" | "unlisted";
  avatarUrl: string | null;

  /** Performance metrics */
  realizedPnlUsd: number;
  volumeUsd: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePercent: number | null;
  averageReturnPercent: number | null;

  /** Portfolio & risk metrics */
  portfolioValueUsd: number;
  unrealizedPnlUsd: number;
  totalPnlUsd: number;
  roiPercent: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdownPercent: number | null;
  aumUsd: number;

  /** Pre-computed rank columns */
  pnlRank: number;
  roiRank: number;
  winrateRank: number;
  sharpeRank: number;
  volumeRank: number;
  aumRank: number;
};

/** Response payload for the multi-dimensional rankings endpoint. */
export type ArenaRankingsPayload = {
  ok: true;
  sortBy: RankingSortBy;
  timeframe: RankingTimeframe;
  limit: number;
  offset: number;
  total: number;
  agents: ArenaRankingAgent[];
};

export type LeaderboardAgent = {
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

export type CurvePoint = {
  t: string;
  pnlUsd: number;
  dailyPnlUsd: number;
  trades: number;
};

export type LeaderboardCurve = {
  agentId: string;
  name: string;
  redacted: boolean;
  points: CurvePoint[];
};

export type LeaderboardTrade = {
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

export type AgentTrade = Omit<LeaderboardTrade, "agentId"> & {
  agentId?: string;
};

export type LeaderboardPayload = {
  ok: true;
  placeholder?: boolean;
  placeholderReason?: string;
  range: RangeOption;
  top: number;
  since: string;
  agents: LeaderboardAgent[];
  curves: LeaderboardCurve[];
  trades: LeaderboardTrade[];
};

export type AgentDetailPayload = {
  ok: true;
  placeholder?: boolean;
  placeholderReason?: string;
  agentId: string;
  range: RangeOption;
  since: string;
  redacted: boolean;
  curve: Array<{
    t: string;
    pnlUsd: number;
    dailyPnlUsd: number;
    trades: number;
    volumeUsd?: number | null;
    wins?: number;
    losses?: number;
  }>;
  trades: AgentTrade[];
};
