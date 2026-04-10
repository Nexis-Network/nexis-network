import { format } from "date-fns";

import type { DeveloperRequestLog } from "@/components/settings/developer/developer-api-data";

export type ApiConsoleActivityPoint = {
  day: string;
  requests: number;
  spendUsd: number;
  billedCredits: number;
};

export type ApiConsoleProductBreakdown = {
  product: string;
  requests: number;
  spendUsd: number;
  billedCredits: number;
};

export type ApiConsoleToolBreakdown = {
  toolName: string;
  calls: number;
};

export type ApiConsoleInsightSummary = {
  averageLatencyMs: number;
  successRate: number;
  uniqueTools: number;
};

function dayKey(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "Unknown" : format(date, "MMM d");
}

function getTimestamp(createdAt: string): number {
  const value = new Date(createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function buildRecentActivity(
  logs: DeveloperRequestLog[],
  limit = 7,
): ApiConsoleActivityPoint[] {
  const grouped = new Map<
    string,
    ApiConsoleActivityPoint & { timestamp: number }
  >();

  logs.forEach((log) => {
    const key = dayKey(log.createdAt);
    const current = grouped.get(key) ?? {
      day: key,
      requests: 0,
      spendUsd: 0,
      billedCredits: 0,
      timestamp: getTimestamp(log.createdAt),
    };

    current.requests += 1;
    current.spendUsd += log.totalCostUsd;
    current.billedCredits += log.billedCredits;
    current.timestamp = Math.max(current.timestamp, getTimestamp(log.createdAt));
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, limit)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ timestamp: _timestamp, ...point }) => point);
}

export function buildProductBreakdown(
  logs: DeveloperRequestLog[],
): ApiConsoleProductBreakdown[] {
  const grouped = new Map<string, ApiConsoleProductBreakdown>();

  logs.forEach((log) => {
    const current = grouped.get(log.product) ?? {
      product: log.product,
      requests: 0,
      spendUsd: 0,
      billedCredits: 0,
    };

    current.requests += 1;
    current.spendUsd += log.totalCostUsd;
    current.billedCredits += log.billedCredits;
    grouped.set(log.product, current);
  });

  return Array.from(grouped.values()).sort((left, right) => right.requests - left.requests);
}

export function buildToolBreakdown(
  logs: DeveloperRequestLog[],
): ApiConsoleToolBreakdown[] {
  const grouped = new Map<string, number>();

  logs.forEach((log) => {
    log.toolNames.forEach((toolName) => {
      grouped.set(toolName, (grouped.get(toolName) ?? 0) + 1);
    });
  });

  return Array.from(grouped.entries())
    .map(([toolName, calls]) => ({ toolName, calls }))
    .sort((left, right) => right.calls - left.calls);
}

export function buildInsightSummary(
  logs: DeveloperRequestLog[],
): ApiConsoleInsightSummary {
  const successfulRequests = logs.filter((log) => log.status === "succeeded").length;
  const latencyValues = logs
    .map((log) => log.responseLatencyMs)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const toolNames = new Set(logs.flatMap((log) => log.toolNames));

  return {
    averageLatencyMs:
      latencyValues.length > 0
        ? Math.round(
            latencyValues.reduce((total, value) => total + value, 0) /
              latencyValues.length,
          )
        : 0,
    successRate:
      logs.length > 0 ? Math.round((successfulRequests / logs.length) * 100) : 0,
    uniqueTools: toolNames.size,
  };
}
