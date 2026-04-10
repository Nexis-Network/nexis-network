"use client";

import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";
import { createEmptyWalletSummary, type WalletSummaryEnvelope } from "@/modules/wallets/profile";
import { unwrapApiPayload } from "@/lib/api-platform";

type UseWalletSummariesOptions = {
  enabled?: boolean;
  /** force cache-busting round-trip */
  refreshKey?: number | string | null;
  /** append ?refresh=1 to bypass server cache */
  forceRefresh?: boolean;
};

export function useWalletSummaries(options: UseWalletSummariesOptions = {}) {
  const { isAuthenticated, user } = useAuthContext();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["wallet-summaries", isAuthenticated ? user?.id ?? "unknown" : "guest", options.refreshKey ?? null],
    [isAuthenticated, user?.id, options.refreshKey],
  );

  const cached = isAuthenticated ? (queryClient.getQueryData<WalletSummaryEnvelope>(queryKey) ?? undefined) : undefined;
  const enabled = (options.enabled ?? true) && isAuthenticated;
  const invalidateWalletSummaries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useWalletRealtimeSubscription({
    enabled,
    onNotify: invalidateWalletSummaries,
    userId: user?.id,
  });

  return useQuery<WalletSummaryEnvelope>({
    queryKey,
    queryFn: ({ signal }) => fetchWalletSummaries({ signal, forceRefresh: options.forceRefresh }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    placeholderData: cached ?? keepPreviousData,
    initialData: cached,
  });
}

export function normalizeWalletSummaryPayload(payload: unknown): WalletSummaryEnvelope {
  const data = unwrapApiPayload<Partial<WalletSummaryEnvelope>>(payload);
  if (!data || !Array.isArray(data.wallets)) {
    return createEmptyWalletSummary();
  }

  return {
    wallets: data.wallets,
    aggregated: data.aggregated ?? {
      totalWallets: data.wallets.length,
      estimatedValueUsd: null,
    },
    fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(),
  };
}

async function fetchWalletSummaries({ signal, forceRefresh }: { signal?: AbortSignal; forceRefresh?: boolean }): Promise<WalletSummaryEnvelope> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const refresh = forceRefresh ? "?refresh=1" : "";
  const response = await fetch(`/api/nex/wallets/summary${refresh}`, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status === 401) {
    return createEmptyWalletSummary();
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to load wallet summaries");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  return normalizeWalletSummaryPayload(payload);
}
