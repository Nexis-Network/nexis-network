import { getWalletHistoryAggregate } from "@/server/settings/wallet-aggregator";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

import { logger } from "@/lib/logger";

const DEFAULT_RANGE_DAYS = 90;

export type OverviewWalletEventCategory = "transaction" | "swap" | "bridge";
export type OverviewAgentEventCategory = "agent_run";

export type OverviewActivityAggregateInput = {
  endDate?: string;
  days?: number;
  conversations: Array<{ timestamp: string }>;
  modelUsage: Array<{ timestamp: string; credits: number }>;
  walletEvents: Array<{
    timestamp: string;
    category: OverviewWalletEventCategory;
  }>;
  agentEvents: Array<{
    timestamp: string;
    category: OverviewAgentEventCategory;
  }>;
};

export type OverviewContributionMetrics = {
  accesses: number;
  credits: number;
  transactions: number;
  swaps: number;
  bridges: number;
  agentRuns: number;
};

export type OverviewContributionDay = {
  date: string;
  value: number;
  metrics: OverviewContributionMetrics;
};

export type OverviewContributionGraph = {
  year: number;
  activeDayCount: number;
  totalCredits: number;
  totalTransactions: number;
  days: OverviewContributionDay[];
};

type ModelUsageRow = {
  requested_at: string;
  metadata: UntypedJson;
};

type ConversationRow = {
  created_at: string;
};

type AgentUsageRow = {
  created_at: string;
};

function toDateKey(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseCreditValue(value: UntypedJson): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getMetricBucket(
  buckets: Map<string, OverviewContributionMetrics>,
  dateKey: string,
) {
  const existing = buckets.get(dateKey);
  if (existing) return existing;
  const created: OverviewContributionMetrics = {
    accesses: 0,
    credits: 0,
    transactions: 0,
    swaps: 0,
    bridges: 0,
    agentRuns: 0,
  };
  buckets.set(dateKey, created);
  return created;
}

function resolveContributionLevel(metrics: OverviewContributionMetrics) {
  const weightedScore =
    metrics.accesses +
    metrics.transactions +
    metrics.swaps * 2 +
    metrics.bridges * 2 +
    metrics.agentRuns * 2 +
    metrics.credits;

  if (weightedScore <= 0) return 0;
  if (weightedScore <= 2) return 1;
  if (weightedScore <= 5) return 2;
  if (weightedScore <= 8) return 3;
  return 4;
}

function knownBridgeLabel(input: string) {
  return /(bridge|across|hop|stargate|layerzero|wormhole|debridge|orbiter|synapse|celer)/i.test(
    input,
  );
}

export function buildOverviewContributionGraph(
  input: OverviewActivityAggregateInput,
): OverviewContributionGraph {
  const endDate = input.endDate ? new Date(input.endDate) : new Date();
  const dayCount = Math.max(1, input.days ?? DEFAULT_RANGE_DAYS);
  const buckets = new Map<string, OverviewContributionMetrics>();

  input.conversations.forEach((conversation) => {
    const dateKey = toDateKey(conversation.timestamp);
    if (!dateKey) return;
    getMetricBucket(buckets, dateKey).accesses += 1;
  });

  input.modelUsage.forEach((usage) => {
    const dateKey = toDateKey(usage.timestamp);
    if (!dateKey) return;
    getMetricBucket(buckets, dateKey).credits += Math.max(0, usage.credits);
  });

  input.walletEvents.forEach((event) => {
    const dateKey = toDateKey(event.timestamp);
    if (!dateKey) return;
    const bucket = getMetricBucket(buckets, dateKey);
    if (event.category === "swap") {
      bucket.swaps += 1;
      return;
    }
    if (event.category === "bridge") {
      bucket.bridges += 1;
      return;
    }
    bucket.transactions += 1;
  });

  input.agentEvents.forEach((event) => {
    const dateKey = toDateKey(event.timestamp);
    if (!dateKey) return;
    if (event.category === "agent_run") {
      getMetricBucket(buckets, dateKey).agentRuns += 1;
    }
  });

  const days: OverviewContributionDay[] = [];

  for (let index = dayCount - 1; index >= 0; index -= 1) {
    const currentDate = new Date(endDate);
    currentDate.setUTCHours(0, 0, 0, 0);
    currentDate.setUTCDate(currentDate.getUTCDate() - index);
    const dateKey = currentDate.toISOString().slice(0, 10);
    const metrics =
      buckets.get(dateKey) ?? {
        accesses: 0,
        credits: 0,
        transactions: 0,
        swaps: 0,
        bridges: 0,
        agentRuns: 0,
      };

    days.push({
      date: dateKey,
      value: resolveContributionLevel(metrics),
      metrics,
    });
  }

  return {
    year: endDate.getUTCFullYear(),
    activeDayCount: days.filter((day) => day.value > 0).length,
    totalCredits: days.reduce((sum, day) => sum + day.metrics.credits, 0),
    totalTransactions: days.reduce(
      (sum, day) =>
        sum +
        day.metrics.transactions +
        day.metrics.swaps +
        day.metrics.bridges,
      0,
    ),
    days,
  };
}

export async function getOverviewContributionGraph(
  userId: string,
  days: number = DEFAULT_RANGE_DAYS,
) {
  const service = createServiceRoleClient();
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(0, days - 1));
  const startIso = startDate.toISOString();

  const [conversationResult, modelUsageResult, agentUsageResult, walletHistory] =
    await Promise.all([
      service
        .from("conversations")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startIso),
      service
        .from("ai_model_usage")
        .select("requested_at, metadata")
        .eq("user_id", userId)
        .gte("requested_at", startIso),
      service
        .from("agent_usage_event")
        .select("created_at")
        .or(`owner_user_id.eq.${userId},renter_user_id.eq.${userId}`)
        .gte("created_at", startIso),
      getWalletHistoryAggregate(userId),
    ]);

  if (conversationResult.error) {
    logger.warn("overview_activity_conversations_failed", conversationResult.error);
  }
  if (modelUsageResult.error) {
    logger.warn("overview_activity_model_usage_failed", modelUsageResult.error);
  }
  if (agentUsageResult.error) {
    logger.warn("overview_activity_agent_usage_failed", agentUsageResult.error);
  }

  const conversationRows = (conversationResult.data ?? []) as ConversationRow[];
  const modelUsageRows = (modelUsageResult.data ?? []) as ModelUsageRow[];
  const agentUsageRows = (agentUsageResult.data ?? []) as AgentUsageRow[];

  const walletEvents = (walletHistory.events ?? [])
    .filter((event) => {
      if (typeof event.timestamp !== "number" || !Number.isFinite(event.timestamp)) {
        return false;
      }
      return event.timestamp >= Date.parse(startIso);
    })
    .map((event) => {
      const combinedLabel = `${event.name ?? ""} ${event.venue ?? ""}`;
      if (knownBridgeLabel(combinedLabel)) {
        return {
          timestamp: new Date(event.timestamp ?? 0).toISOString(),
          category: "bridge" as const,
        };
      }
      if (event.type === "buy" || event.type === "sell") {
        return {
          timestamp: new Date(event.timestamp ?? 0).toISOString(),
          category: "swap" as const,
        };
      }
      return {
        timestamp: new Date(event.timestamp ?? 0).toISOString(),
        category: "transaction" as const,
      };
    });

  return buildOverviewContributionGraph({
    endDate: new Date().toISOString(),
    days,
    conversations: conversationRows.map((row) => ({
      timestamp: row.created_at,
    })),
    modelUsage: modelUsageRows.map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, UntypedJson>)
          : {};
      const credits =
        parseCreditValue(metadata.finalCharge) ||
        parseCreditValue(metadata.reservedCharge) ||
        parseCreditValue(metadata.tokenCredits) +
          parseCreditValue(metadata.featureCredits);

      return {
        timestamp: row.requested_at,
        credits,
      };
    }),
    walletEvents,
    agentEvents: agentUsageRows.map((row) => ({
      timestamp: row.created_at,
      category: "agent_run" as const,
    })),
  });
}
