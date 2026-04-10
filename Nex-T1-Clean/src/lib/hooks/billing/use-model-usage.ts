"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsageStats, type UsageStats } from "@/modules/ai/cost-monitor";
import { useAuthContext } from "@/hooks/auth/use-auth-context";

export type ModelUsageEntry = {
  model: string;
  tokens: number;
  cost: number;
  requests: number;
};

export function useModelUsage() {
  const { user } = useAuthContext();
  const userId = user?.id ?? undefined;

  const { data, isLoading, error, refetch } = useQuery<UsageStats | null>({
    queryKey: ["model-usage", userId],
    queryFn: () => {
      // Get usage for current billing period (last 30 days)
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);
      
      return getUsageStats({
        periodStart,
        periodEnd: new Date(),
        userId,
      });
    },
    enabled: !!userId,
    staleTime: 60_000, // 1 minute
    retry: 1,
  });

  const modelUsage: ModelUsageEntry[] = useMemo(() => {
    if (!data?.byModel) return [];
    
    return Object.entries(data.byModel).map(([model, stats]) => ({
      model: formatModelName(model),
      tokens: stats.tokens,
      cost: stats.cost,
      requests: stats.requests,
    }));
  }, [data?.byModel]);

  return {
    modelUsage,
    totalTokens: data?.totalTokens ?? 0,
    totalCost: data?.totalCost ?? 0,
    totalRequests: data?.totalRequests ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

function formatModelName(modelId: string): string {
  // Clean up model ID for display
  const base = modelId.includes("/") ? modelId.split("/").pop() ?? modelId : modelId;
  
  const mappings: Record<string, string> = {
    "gpt-5-nano": "Nex Fast",
    "gpt-5-mini": "Nex Mini",
    "gpt-5": "Nex Standard",
    "gpt-4o-mini": "Nex Fast",
    "gpt-4o": "Nex Standard",
    "gpt-5.4": "Nex Reasoning",
  };

  return mappings[base] ?? base;
}
