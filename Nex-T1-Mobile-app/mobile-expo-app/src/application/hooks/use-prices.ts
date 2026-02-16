/**
 * React Query hook for token price data.
 *
 * Fetches USD prices from CoinGecko with automatic caching and
 * background refetching. Other hooks (gas, staking, portfolio)
 * compose with this hook for USD conversion.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchPrices } from '@infrastructure/api/price-api';
import type { TokenPrice } from '@domain/market/entities/price';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRICES_QUERY_KEY = 'token-prices';
const STALE_TIME_MS = 15_000;
const REFETCH_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UsePricesOptions {
  readonly ids: readonly string[];
  readonly enabled?: boolean;
}

export function usePrices({ ids, enabled = true }: UsePricesOptions) {
  return useQuery<ReadonlyArray<TokenPrice>>({
    queryKey: [PRICES_QUERY_KEY, ...ids],
    queryFn: async () => {
      const result = await fetchPrices(ids);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: enabled && ids.length > 0,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Extract a USD price from a prices array by CoinGecko ID.
 * Returns undefined if the price is not found.
 */
export function getPriceById(
  prices: ReadonlyArray<TokenPrice> | undefined,
  id: string,
): number | undefined {
  return prices?.find((p) => p.id === id)?.usdPrice;
}
