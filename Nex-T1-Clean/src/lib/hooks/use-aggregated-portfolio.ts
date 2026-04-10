"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AggregatedPortfolio } from "@/server/services/portfolio-service";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";

const EMPTY_AGGREGATED_PORTFOLIO: AggregatedPortfolio = {
  totalNetWorthUsd: 0,
  wallets: [],
  assets: [],
  transactions: [],
  lastRefreshed: new Date(0).toISOString(),
};

const isRecord = (value: UntypedJson): value is Record<string, UntypedJson> =>
  typeof value === "object" && value !== null;

const toNumber = (value: UntypedJson, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toStringOrNow = (value: UntypedJson): string =>
  typeof value === "string" && value.length > 0 ? value : new Date().toISOString();

export function normalizeAggregatedPortfolioPayload(payload: UntypedJson): AggregatedPortfolio {
  const data = unwrapApiPayload<AggregatedPortfolio>(payload);
  if (!isRecord(data)) {
    return {
      ...EMPTY_AGGREGATED_PORTFOLIO,
      lastRefreshed: new Date().toISOString(),
    };
  }

  const wallets = Array.isArray(data.wallets) ? data.wallets : [];
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];

  return {
    totalNetWorthUsd: toNumber(data.totalNetWorthUsd, 0),
    wallets,
    assets,
    transactions,
    lastRefreshed: toStringOrNow(data.lastRefreshed),
  };
}

async function parsePortfolioResponse(response: Response, fallbackMessage: string): Promise<AggregatedPortfolio> {
  const raw = await response.text().catch(() => "");
  let payload: UntypedJson = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = getApiErrorMessage(payload, raw || fallbackMessage);
    throw new Error(detail);
  }

  return normalizeAggregatedPortfolioPayload(payload);
}

export function useAggregatedPortfolio() {
  const { isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ["portfolio", "aggregated"];

  const { data, isLoading, error, isFetching } = useQuery<AggregatedPortfolio>({
    queryKey,
    enabled: isAuthenticated,
    queryFn: async () => {
      const resp = await fetch("/api/portfolio/aggregated");
      if (resp.status === 401 || resp.status === 403) {
        return {
          ...EMPTY_AGGREGATED_PORTFOLIO,
          lastRefreshed: new Date().toISOString(),
        };
      }
      return parsePortfolioResponse(resp, "Failed to load aggregated portfolio");
    },
    staleTime: 30000, // 30s
    retry: (failureCount, err) => {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        message.includes("unauthorized") ||
        message.includes("forbidden") ||
        message.includes("401") ||
        message.includes("403")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        return {
          ...EMPTY_AGGREGATED_PORTFOLIO,
          lastRefreshed: new Date().toISOString(),
        };
      }
      const resp = await fetch("/api/portfolio/refresh", { method: "POST" });
      if (resp.status === 401 || resp.status === 403) {
        return {
          ...EMPTY_AGGREGATED_PORTFOLIO,
          lastRefreshed: new Date().toISOString(),
        };
      }
      return parsePortfolioResponse(resp, "Failed to refresh portfolio");
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(queryKey, newData);
    },
  });

  return {
    portfolio: isAuthenticated ? data : EMPTY_AGGREGATED_PORTFOLIO,
    isLoading: isAuthenticated ? isLoading : false,
    isRefetching: isFetching,
    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error,
    error,
    refresh: refreshMutation.mutateAsync,
  };
}
