"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/lib/api-platform";
import type {
  CoinMentionContextRecord,
  TokenMentionRecentCollection,
  TokenMentionSearchResult,
} from "@/components/chat-composer/token-mentions";

type TokenMentionSearchResponse = {
  results: TokenMentionSearchResult[];
  fetchedAt: string;
  cache: "hit" | "miss";
  stale: boolean;
};

type TokenMentionRecentResponse = TokenMentionSearchResponse & {
  source: TokenMentionRecentCollection["source"];
};

type CoinMentionRecordResponse = {
  record: CoinMentionContextRecord;
  fetchedAt: string;
  cache: "hit" | "miss";
  stale: boolean;
};

type CoinMentionContextResponse = {
  records: CoinMentionContextRecord[];
  context: string;
  fetchedAt: string;
  cache: "hit" | "miss";
  stale: boolean;
};

async function fetchApiData<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.success !== true || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data;
}

async function fetchTokenMentionSearch(
  query: string,
): Promise<TokenMentionSearchResponse> {
  const params = new URLSearchParams({ query });
  return fetchApiData<TokenMentionSearchResponse>(`/api/chat/token-mentions?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
}

async function fetchRecentTokenMentions(): Promise<TokenMentionRecentResponse> {
  const params = new URLSearchParams({ recent: "true" });
  return fetchApiData<TokenMentionRecentResponse>(`/api/chat/token-mentions?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
}

async function fetchCoinMentionRecord(
  id: string,
): Promise<CoinMentionRecordResponse> {
  const params = new URLSearchParams({ id });
  return fetchApiData<CoinMentionRecordResponse>(`/api/chat/token-mentions?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchCoinMentionContext(
  ids: string[],
): Promise<CoinMentionContextResponse> {
  return fetchApiData<CoinMentionContextResponse>("/api/chat/token-mentions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
}

export function useTokenMentionSearch(
  query: string,
  options?: { enabled?: boolean },
) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["token-mention-search", normalizedQuery],
    queryFn: () => fetchTokenMentionSearch(normalizedQuery),
    enabled: (options?.enabled ?? true) && normalizedQuery.length > 0,
    staleTime: 15_000,
  });
}

export function useRecentTokenMentions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["token-mention-recent"],
    queryFn: fetchRecentTokenMentions,
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useCoinMentionRecord(id: string, enabled = true) {
  const normalizedId = id.trim().toLowerCase();

  return useQuery({
    queryKey: ["coin-mention-record", normalizedId],
    queryFn: () => fetchCoinMentionRecord(normalizedId),
    enabled: enabled && normalizedId.length > 0,
    staleTime: 5 * 60_000,
  });
}
