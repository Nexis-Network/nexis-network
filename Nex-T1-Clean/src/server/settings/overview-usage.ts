import "server-only";

import {
  ACTIVE_TASK_STATUSES,
  type TaskStatusType,
} from "@/server/tasks/types";
import {
  enqueueSettingsPortfolioSummaryRefresh,
} from "@/server/portfolio/settings-summary-queue";
import {
  readCachedSettingsPortfolioSummary,
  refreshSettingsPortfolioSummaryCache,
} from "@/server/portfolio/settings-summary-cache";
import { getOverviewContributionGraph } from "@/server/settings/overview-activity";
import { getCreditBalance } from "@/server/services/credits";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { defaultAlchemyClient } from "@/server/services/mcp/alchemy-client";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";
import { getEvmUnifiedPnL } from "@/server/moralis/evm/wallet";
import { listCdpWalletAccountRecords } from "@/server/wallets/user-wallets";
import type { SettingsPortfolioSummary } from "@/lib/portfolio/settings-summary";
import { roundTo } from "@/lib/portfolio/settings-summary";
import { logger } from "@/lib/logger";

const OVERVIEW_USAGE_WINDOW_DAYS = 90;

type UsageWindow = {
  days: number;
  label: string;
  startDate: string;
  endDate: string;
};

type UsageWalletMetrics = {
  totalBalanceUsd: number;
  balanceChangeUsd24h: number | null;
  balanceChangePct24h: number | null;
  investmentsUsd: number;
  investmentsAllocationPct: number;
  stablecoinsUsd: number;
  stablecoinsAllocationPct: number;
  profitLossUsd: number | null;
  profitLossRoiPct: number | null;
  profitLossConfidence: "high" | "medium" | "low" | "unavailable";
  nftCount: number;
  walletCount: number;
  evmWalletCount: number;
  solanaWalletCount: number;
};

type UsageCreditMetrics = {
  remaining: number | null;
  used: number | null;
  limit: number | null;
  monthlyRemaining: number | null;
  overageCredits: number | null;
  usedRatioPct: number | null;
  plan: string | null;
  resetAt: string | null;
};

type UsageActivityMetrics = {
  activeDays: number;
  messagesToAgents: number;
  conversations: number;
  swaps: number;
  bridges: number;
  transactions: number;
  agentRuns: number;
  tasksConfigured: number;
  activeTasks: number;
  taskRuns: number;
  creditsConsumed: number;
};

export type SettingsOverviewUsageSummary = {
  generatedAt: string;
  window: UsageWindow;
  wallet: UsageWalletMetrics;
  credits: UsageCreditMetrics;
  activity: UsageActivityMetrics;
};

type CountResult = {
  count: number;
};

type WalletSource = {
  address: string;
  platform: "evm" | "solana";
  chainId: number | null;
};

function countOrZero(result: CountResult | null | undefined): number {
  return typeof result?.count === "number" && Number.isFinite(result.count)
    ? result.count
    : 0;
}

function deriveBalanceChangeUsd(currentUsd: number, pct: number | null | undefined) {
  if (
    typeof pct !== "number" ||
    !Number.isFinite(pct) ||
    typeof currentUsd !== "number" ||
    !Number.isFinite(currentUsd)
  ) {
    return null;
  }

  const multiplier = 1 + pct / 100;
  if (multiplier <= 0) {
    return null;
  }

  return roundTo(currentUsd - currentUsd / multiplier, 2);
}

function buildWindow(days: number): UsageWindow {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));

  return {
    days,
    label: `Last ${days} days`,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

async function getPortfolioSummary(userId: string): Promise<SettingsPortfolioSummary> {
  const cached = await readCachedSettingsPortfolioSummary({
    userId,
    range: "month",
  }).catch(() => null);

  if (cached) {
    if (cached.status === "stale") {
      await enqueueSettingsPortfolioSummaryRefresh({
        userId,
        range: "month",
        reason: "stale",
      }).catch(() => undefined);
    }

    return cached.summary;
  }

  return refreshSettingsPortfolioSummaryCache({
    userId,
    range: "month",
  });
}

function dedupeWalletSources(records: Awaited<ReturnType<typeof listCdpWalletAccountRecords>>): WalletSource[] {
  const seen = new Set<string>();
  const sources: WalletSource[] = [];

  for (const record of records) {
    const address =
      typeof record.address === "string" ? record.address.trim() : "";
    if (!address) {
      continue;
    }

    const platform = record.platform?.trim().toLowerCase() === "solana"
      ? "solana"
      : "evm";
    const chainId = typeof record.chain_id === "number" ? record.chain_id : null;
    const key = [platform, chainId ?? "sol", address.toLowerCase()].join(":");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    sources.push({
      address,
      platform,
      chainId,
    });
  }

  return sources;
}

function extractAlchemyNftCount(payload: UntypedJson): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, UntypedJson>;
  const direct = [
    record.totalCount,
    record.total_count,
    record.ownedNftsCount,
    record.owned_nfts_count,
  ].find((value) => typeof value === "number" || typeof value === "string");

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return direct;
  }

  if (typeof direct === "string") {
    const parsed = Number(direct);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const ownedNfts = Array.isArray(record.ownedNfts)
    ? record.ownedNfts
    : Array.isArray(record.nfts)
      ? record.nfts
      : null;

  return ownedNfts ? ownedNfts.length : null;
}

async function getEvmWalletNftCount(
  address: string,
  chainId: number | null,
): Promise<number> {
  try {
    const response = await defaultAlchemyClient.invokeRaw("get_nfts_for_owner", {
      address,
      owner: address,
      chainId: chainId ?? undefined,
      chain: chainId != null ? String(chainId) : undefined,
      network: chainId != null ? String(chainId) : undefined,
      pageSize: 1,
      page_size: 1,
      withMetadata: false,
      with_metadata: false,
    });

    const count = extractAlchemyNftCount(
      response.toolResult ?? response.response?.toolResult,
    );

    return typeof count === "number" && Number.isFinite(count) ? count : 0;
  } catch (error) {
    logger.warn("settings_overview_alchemy_nft_count_failed", {
      address,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

async function getSolanaWalletNftCount(address: string): Promise<number> {
  try {
    const summary = await fetchNexSolanaWalletSummary(address, {
      includeTokens: false,
      includeNfts: true,
      limit: 100,
      skipCache: false,
    });

    return Array.isArray(summary.nfts) ? summary.nfts.length : 0;
  } catch (error) {
    logger.warn("settings_overview_solana_nft_count_failed", {
      address,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

async function getEmbeddedWalletNftCount(sources: WalletSource[]): Promise<number> {
  const counts = await Promise.all(
    sources.map((source) =>
      source.platform === "evm"
        ? getEvmWalletNftCount(source.address, source.chainId)
        : getSolanaWalletNftCount(source.address),
    ),
  );

  return counts.reduce((sum, value) => sum + value, 0);
}

type PnlSnapshot = Awaited<ReturnType<typeof getEvmUnifiedPnL>>;

function aggregatePnl(pnls: PnlSnapshot[]) {
  let totalProfitLoss = 0;
  let totalCostBasis = 0;
  let hasProfitLoss = false;
  let hasCostBasis = false;
  let highConfidence = 0;
  let lowConfidence = 0;

  for (const pnl of pnls) {
    if (!pnl) {
      continue;
    }

    if (typeof pnl.totalUsd === "number" && Number.isFinite(pnl.totalUsd)) {
      totalProfitLoss += pnl.totalUsd;
      hasProfitLoss = true;
    }

    if (
      typeof pnl.costBasisUsd === "number" &&
      Number.isFinite(pnl.costBasisUsd) &&
      pnl.costBasisUsd > 0
    ) {
      totalCostBasis += pnl.costBasisUsd;
      hasCostBasis = true;
    }

    if (pnl.confidence === "high") {
      highConfidence += 1;
    } else {
      lowConfidence += 1;
    }
  }

  const roi =
    hasCostBasis && totalCostBasis > 0
      ? roundTo((totalProfitLoss / totalCostBasis) * 100, 2)
      : null;

  let confidence: UsageWalletMetrics["profitLossConfidence"] = "unavailable";
  if (hasProfitLoss) {
    confidence =
      highConfidence > 0 && lowConfidence === 0
        ? "high"
        : highConfidence > 0
          ? "medium"
          : "low";
  }

  return {
    profitLossUsd: hasProfitLoss ? roundTo(totalProfitLoss, 2) : null,
    profitLossRoiPct: roi,
    profitLossConfidence: confidence,
  };
}

async function getProfitLossSummary(sources: WalletSource[]) {
  const evmSources = sources.filter((source) => source.platform === "evm");
  const pnls = await Promise.all(
    evmSources.map((source) =>
      getEvmUnifiedPnL({
        address: source.address,
        chain: source.chainId,
      }).catch((error) => {
        logger.warn("settings_overview_pnl_failed", {
          address: source.address,
          chainId: source.chainId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }),
    ),
  );

  return aggregatePnl(pnls.filter((item): item is PnlSnapshot => item !== null));
}

async function countConversationsAndMessages(userId: string, startIso: string) {
  const service = createServiceRoleClient();

  const [conversationsResult, messagesResult] = await Promise.all([
    service
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startIso),
    service
      .from("conversation_messages")
      .select("id, conversations!inner(user_id)", {
        count: "exact",
        head: true,
      })
      .eq("role", "user")
      .eq("conversations.user_id", userId)
      .gte("created_at", startIso),
  ]);

  if (conversationsResult.error) {
    logger.warn("settings_overview_conversation_count_failed", {
      userId,
      error: conversationsResult.error.message,
    });
  }

  if (messagesResult.error) {
    logger.warn("settings_overview_message_count_failed", {
      userId,
      error: messagesResult.error.message,
    });
  }

  return {
    conversations: countOrZero({ count: conversationsResult.count ?? 0 }),
    messagesToAgents: countOrZero({ count: messagesResult.count ?? 0 }),
  };
}

async function countTasks(userId: string, startIso: string) {
  const service = createServiceRoleClient();

  const [tasksResult, activeTasksResult, taskRunsResult] = await Promise.all([
    service
      .from("agent_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    service
      .from("agent_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ACTIVE_TASK_STATUSES as TaskStatusType[]),
    service
      .from("task_runs")
      .select("id, agent_tasks!inner(user_id)", { count: "exact", head: true })
      .eq("agent_tasks.user_id", userId)
      .gte("created_at", startIso),
  ]);

  if (tasksResult.error) {
    logger.warn("settings_overview_task_count_failed", {
      userId,
      error: tasksResult.error.message,
    });
  }

  if (activeTasksResult.error) {
    logger.warn("settings_overview_active_task_count_failed", {
      userId,
      error: activeTasksResult.error.message,
    });
  }

  if (taskRunsResult.error) {
    logger.warn("settings_overview_task_runs_count_failed", {
      userId,
      error: taskRunsResult.error.message,
    });
  }

  return {
    tasksConfigured: countOrZero({ count: tasksResult.count ?? 0 }),
    activeTasks: countOrZero({ count: activeTasksResult.count ?? 0 }),
    taskRuns: countOrZero({ count: taskRunsResult.count ?? 0 }),
  };
}

export function buildSettingsOverviewUsageSummary(input: {
  generatedAt?: string;
  window: UsageWindow;
  portfolioSummary: SettingsPortfolioSummary;
  profitLoss: Pick<
    UsageWalletMetrics,
    "profitLossUsd" | "profitLossRoiPct" | "profitLossConfidence"
  >;
  nftCount: number;
  credits: Awaited<ReturnType<typeof getCreditBalance>>;
  conversations: number;
  messagesToAgents: number;
  tasksConfigured: number;
  activeTasks: number;
  taskRuns: number;
  activityGraph: Awaited<ReturnType<typeof getOverviewContributionGraph>>;
}): SettingsOverviewUsageSummary {
  const { portfolioSummary, activityGraph } = input;
  const swaps = activityGraph.days.reduce(
    (sum, day) => sum + day.metrics.swaps,
    0,
  );
  const bridges = activityGraph.days.reduce(
    (sum, day) => sum + day.metrics.bridges,
    0,
  );
  const agentRuns = activityGraph.days.reduce(
    (sum, day) => sum + day.metrics.agentRuns,
    0,
  );
  const usedRatioPct =
    typeof input.credits.limit === "number" && input.credits.limit > 0
      ? roundTo((input.credits.used / input.credits.limit) * 100, 1)
      : null;

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    window: input.window,
    wallet: {
      totalBalanceUsd: roundTo(portfolioSummary.totalPortfolioUsd, 2),
      balanceChangeUsd24h: deriveBalanceChangeUsd(
        portfolioSummary.totalPortfolioUsd,
        portfolioSummary.totalDeltaPct,
      ),
      balanceChangePct24h: portfolioSummary.totalDeltaPct,
      investmentsUsd: roundTo(
        portfolioSummary.slices.investments.totalUsd,
        2,
      ),
      investmentsAllocationPct: roundTo(
        portfolioSummary.slices.investments.allocationPct,
        1,
      ),
      stablecoinsUsd: roundTo(
        portfolioSummary.slices.stablecoins.totalUsd,
        2,
      ),
      stablecoinsAllocationPct: roundTo(
        portfolioSummary.slices.stablecoins.allocationPct,
        1,
      ),
      profitLossUsd: input.profitLoss.profitLossUsd,
      profitLossRoiPct: input.profitLoss.profitLossRoiPct,
      profitLossConfidence: input.profitLoss.profitLossConfidence,
      nftCount: Math.max(0, Math.trunc(input.nftCount)),
      walletCount:
        portfolioSummary.wallets.evmCount + portfolioSummary.wallets.solanaCount,
      evmWalletCount: portfolioSummary.wallets.evmCount,
      solanaWalletCount: portfolioSummary.wallets.solanaCount,
    },
    credits: {
      remaining: input.credits.remaining,
      used: input.credits.used,
      limit: input.credits.limit,
      monthlyRemaining: input.credits.monthlyRemaining,
      overageCredits: input.credits.overageCredits,
      usedRatioPct,
      plan: input.credits.plan,
      resetAt: input.credits.resetAt.toISOString(),
    },
    activity: {
      activeDays: activityGraph.activeDayCount,
      messagesToAgents: input.messagesToAgents,
      conversations: input.conversations,
      swaps,
      bridges,
      transactions: activityGraph.totalTransactions,
      agentRuns,
      tasksConfigured: input.tasksConfigured,
      activeTasks: input.activeTasks,
      taskRuns: input.taskRuns,
      creditsConsumed: activityGraph.totalCredits,
    },
  };
}

export async function getSettingsOverviewUsageSummary(
  userId: string,
): Promise<SettingsOverviewUsageSummary> {
  const generatedAt = new Date().toISOString();
  const window = buildWindow(OVERVIEW_USAGE_WINDOW_DAYS);
  const embeddedWalletRecords = await listCdpWalletAccountRecords(userId);
  const walletSources = dedupeWalletSources(embeddedWalletRecords);

  const [
    portfolioSummary,
    credits,
    activityGraph,
    counts,
    tasks,
    nftCount,
    profitLoss,
  ] = await Promise.all([
    getPortfolioSummary(userId),
    getCreditBalance(userId),
    getOverviewContributionGraph(userId, OVERVIEW_USAGE_WINDOW_DAYS),
    countConversationsAndMessages(userId, window.startDate),
    countTasks(userId, window.startDate),
    getEmbeddedWalletNftCount(walletSources),
    getProfitLossSummary(walletSources),
  ]);

  return buildSettingsOverviewUsageSummary({
    generatedAt,
    window,
    portfolioSummary,
    profitLoss,
    nftCount,
    credits,
    conversations: counts.conversations,
    messagesToAgents: counts.messagesToAgents,
    tasksConfigured: tasks.tasksConfigured,
    activeTasks: tasks.activeTasks,
    taskRuns: tasks.taskRuns,
    activityGraph,
  });
}
