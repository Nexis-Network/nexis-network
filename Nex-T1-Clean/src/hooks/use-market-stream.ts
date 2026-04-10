import { useEffect, useMemo } from "react";
import { useMarketPricesStore, type MarketPriceEntry } from "@/stores/use-market-prices";

export interface CoinData {
  price?: number;
  change_24h?: number;
  vol_24h?: number;
  last_updated_at?: number;
  [key: string]: unknown;
}

/**
 * Subscribe to real-time price updates for multiple coins via the shared SSE connection.
 *
 * Uses the centralized market prices Zustand store which maintains a single EventSource
 * connection with reference-counted subscriptions — no matter how many components call
 * this hook, only ONE SSE connection is created.
 */
export function useMarketStream(coinIds: string[]) {
  const subscribe = useMarketPricesStore((s) => s.subscribe);
  const unsubscribe = useMarketPricesStore((s) => s.unsubscribe);
  const prices = useMarketPricesStore((s) => s.prices);
  const isConnected = useMarketPricesStore((s) => s.isConnected);

  const normalizedIds = useMemo(
    () =>
      Array.from(new Set(coinIds.map((id) => id.trim().toLowerCase()).filter(Boolean))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coinIds.join(",")],
  );

  useEffect(() => {
    for (const id of normalizedIds) {
      subscribe(id);
    }
    return () => {
      for (const id of normalizedIds) {
        unsubscribe(id);
      }
    };
  }, [normalizedIds, subscribe, unsubscribe]);

  // Convert store format back to the CoinData format consumers expect
  const data = useMemo(() => {
    const result: Record<string, CoinData> = {};
    for (const id of normalizedIds) {
      const entry: MarketPriceEntry | undefined = prices[id];
      if (entry) {
        result[id] = {
          price: entry.price,
          change_24h: entry.change24h,
          last_updated_at: entry.lastUpdate,
        };
      }
    }
    return result;
  }, [normalizedIds, prices]);

  return { data, isConnected };
}
