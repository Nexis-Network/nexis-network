"use client";

import { useMemo } from "react";
import {
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single transaction record from the CDP transactions API. */
export type CdpTransaction = {
  id: string;
  txHash: string | null;
  type: string;
  status: string;
  from: string;
  to: string;
  amount: string;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  chainId: number | string;
  timestamp: string;
  gasUsed: string | null;
  gasFeeUsd: number | null;
};

/** Paginated envelope returned by the CDP transactions API. */
export type CdpTxHistoryPage = {
  transactions: CdpTransaction[];
  total: number;
  hasMore: boolean;
};

/** Options for the CDP transaction history query. */
export type CdpTxHistoryOptions = {
  /** Filter by chain ID. */
  chainId?: number;
  /** Number of transactions per page (default: 20). */
  limit?: number;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const CDP_TX_HISTORY_KEY = (
  address: string,
  chainId?: number,
  limit?: number,
) => ["cdp-tx-history", address, chainId, limit] as const;

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchCdpTxHistoryPage(
  address: string,
  options: CdpTxHistoryOptions,
  offset: number,
  signal?: AbortSignal,
): Promise<CdpTxHistoryPage> {
  const headers = await getAuthHeaders();

  const limit = options.limit ?? 20;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (typeof options.chainId === "number") {
    params.set("chainId", String(options.chainId));
  }

  const url = `/api/cdp/wallets/${encodeURIComponent(address)}/transactions?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch CDP transaction history");
  }

  const payload = (await response.json()) as { data?: CdpTxHistoryPage };
  const data = payload.data;

  if (!data) {
    throw new Error("CDP transaction history response missing data");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Infinite-scroll hook for Nex Wallet transaction history.
 *
 * Uses offset-based pagination. Call `fetchNextPage()` to load the next
 * batch of transactions when the user scrolls to the bottom of the list.
 *
 * @param address - The wallet address to query. Pass `null` to disable.
 * @param options - Optional chain ID and page size configuration.
 *
 * @returns `{ transactions, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage, error }`.
 */
export function useCdpTxHistory(
  address: string | null,
  options: CdpTxHistoryOptions = {},
): {
  transactions: CdpTransaction[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
} {
  const limit = options.limit ?? 20;

  const stableOptions = useMemo(
    () => ({ chainId: options.chainId, limit }),
    [options.chainId, limit],
  );

  const query = useInfiniteQuery<
    CdpTxHistoryPage,
    Error,
    InfiniteData<CdpTxHistoryPage>,
    ReturnType<typeof CDP_TX_HISTORY_KEY>,
    number
  >({
    queryKey: CDP_TX_HISTORY_KEY(
      address ?? "",
      stableOptions.chainId,
      stableOptions.limit,
    ),
    queryFn: ({ signal, pageParam }) =>
      fetchCdpTxHistoryPage(address!, stableOptions, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      const totalFetched = allPages.reduce(
        (sum, page) => sum + page.transactions.length,
        0,
      );
      return totalFetched;
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const transactions = useMemo(
    () =>
      query.data?.pages.flatMap((page) => page.transactions) ?? [],
    [query.data],
  );

  return {
    transactions,
    fetchNextPage: () => {
      query.fetchNextPage().catch(() => {});
    },
    hasNextPage: query.hasNextPage ?? false,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    error: query.error,
  };
}
