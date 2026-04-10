"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";
import type { ApiResponse } from "@/lib/api-platform";
import type {
  SettingsPortfolioRange,
  SettingsPortfolioSummary,
  SettingsPortfolioWalletFilter,
} from "@/lib/portfolio/settings-summary";

async function fetchSettingsPortfolioSummary(
  range: SettingsPortfolioRange,
  walletScope: SettingsPortfolioWalletFilter,
): Promise<SettingsPortfolioSummary> {
  const response = await fetch(
    `/api/portfolio/settings-summary?range=${encodeURIComponent(range)}&walletScope=${encodeURIComponent(walletScope)}`,
    {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as ApiResponse<SettingsPortfolioSummary> | null;
  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.error?.message ?? `Failed to load portfolio summary (${response.status})`);
  }

  return payload.data;
}

export function useSettingsPortfolioSummary(
  range: SettingsPortfolioRange,
  walletScope: SettingsPortfolioWalletFilter = "all",
) {
  const { isAuthenticated, user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["settings", "portfolio-summary", range, walletScope],
    [range, walletScope],
  );
  const invalidateSummary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useWalletRealtimeSubscription({
    enabled: isAuthenticated,
    onNotify: invalidateSummary,
    userId: user?.id,
  });

  return useQuery({
    queryKey,
    queryFn: () => fetchSettingsPortfolioSummary(range, walletScope),
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
