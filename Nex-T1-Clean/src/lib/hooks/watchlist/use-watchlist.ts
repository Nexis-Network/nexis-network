"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { WatchlistItemInput } from "@/modules/watchlist/validation";
import type { WatchlistAssetType, WatchlistItemSnapshot, WatchlistResponse } from "@/types/watchlist";

const buildKey = (currency: string) => ["watchlist", currency];

async function fetchWatchlist(currency: string): Promise<WatchlistResponse> {
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`/api/watchlist?vsCurrency=${encodeURIComponent(currency)}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    return { watchlist: null, stats: { currency, totalItems: 0, updatedAt: new Date().toISOString() } };
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "Unable to load watchlist");
    throw new Error(message || "Unable to load watchlist");
  }

  return (await response.json()) as WatchlistResponse;
}

async function postJson<T>(url: string, body: UntypedJson): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  const response = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "Request failed");
    throw new Error(text || "Request failed");
  }
  return (await response.json()) as T;
}

async function deleteJson(url: string): Promise<void> {
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "Request failed");
    throw new Error(text || "Request failed");
  }
}

function keyFor(assetId: string, assetType: string) {
  return `${assetType}:${assetId}`.toLowerCase();
}

export function useWatchlist(currency: string) {
  const { isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: buildKey(currency),
    queryFn: () => fetchWatchlist(currency),
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 120_000,
    refetchInterval: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: (payload: WatchlistItemInput) =>
      postJson<{ item: WatchlistItemSnapshot; alreadyExisted: boolean }>("/api/watchlist/items", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: buildKey(currency) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => deleteJson(`/api/watchlist/items/${itemId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: buildKey(currency) });
    },
  });

  const watchlist = query.data?.watchlist ?? null;
  const items = watchlist?.items ?? [];

  const itemMap = useMemo(() => {
    const map = new Map<string, WatchlistItemSnapshot>();
    for (const item of items) {
      map.set(keyFor(item.assetId, item.assetType), item);
    }
    return map;
  }, [items]);

  const findItem = (assetId: string, assetType: WatchlistAssetType) => itemMap.get(keyFor(assetId, assetType));

  return {
    watchlist,
    items,
    isAuthenticated,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    addItem: addMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    findItem,
    isMutating: addMutation.isPending || removeMutation.isPending,
    refetch: query.refetch,
  };
}
