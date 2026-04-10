"use client";

import { useEffect, useState, useRef } from "react";
import { unwrapApiPayload } from "@/lib/api-platform";
import { isNonProductionClientTestMode } from "@/lib/utils/is-non-production-client-test-mode";
import { useMarketPricesStore } from "@/stores/use-market-prices";

export interface TokenPriceData {
  price: number;
  change24h: number;
  lastUpdate: number;
}

type PriceRecord = {
  value?: number;
  priceChange24h?: number;
};

type LiveAssetApiPayload = {
  priceUsd?: number | null;
  change24hPct?: number | null;
};

export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  matic: "matic-network",
  pol: "matic-network",
  avax: "avalanche-2",
  arb: "arbitrum",
  op: "optimism",
  link: "chainlink",
  usdc: "usd-coin",
  usdt: "tether",
  doge: "dogecoin",
  xrp: "ripple",
  ada: "cardano",
};

/** Delay before HTTP polling activates (gives SSE time to connect) */
const POLL_DELAY_MS = 5_000;

/**
 * Hook to get live price updates for a token.
 *
 * Uses the shared market price Zustand store for SSE-based real-time updates
 * (single connection shared across all components). Falls back to HTTP polling
 * only when SSE fails to connect within 5 seconds.
 */
export function useLiveAsset(
  symbol: string,
  initialPrice: number = 0,
  chainId: string,
  initialChange24h: number = 0,
  address?: string,
  refreshMs: number = 30000,
) {
  const normalizedSymbol = symbol.trim().toLowerCase();
  const resolvedCoinId = SYMBOL_TO_COINGECKO_ID[normalizedSymbol] ?? normalizedSymbol;
  const testMode = isNonProductionClientTestMode();

  // ─── SSE via shared store ──────────────────────────────────
  const subscribe = useMarketPricesStore((s) => s.subscribe);
  const unsubscribe = useMarketPricesStore((s) => s.unsubscribe);
  const ssePrice = useMarketPricesStore((s) => s.prices[resolvedCoinId] ?? null);
  useEffect(() => {
    if (testMode || !resolvedCoinId) return;
    subscribe(resolvedCoinId);
    return () => unsubscribe(resolvedCoinId);
  }, [resolvedCoinId, subscribe, testMode, unsubscribe]);

  // ─── Local state (merges SSE + polling + initial) ──────────
  const [polledData, setPolledData] = useState<TokenPriceData>({
    price: initialPrice,
    change24h: initialChange24h,
    lastUpdate: Date.now(),
  });

  const pollActiveRef = useRef(false);

  // Sync initial props on change
  useEffect(() => {
    setPolledData({
      price: initialPrice,
      change24h: initialChange24h,
      lastUpdate: Date.now(),
    });
  }, [symbol, initialPrice, initialChange24h, chainId, address]);

  // ─── HTTP polling fallback (only when SSE is down) ─────────
  useEffect(() => {
    if (testMode) {
      pollActiveRef.current = false;
      return;
    }

    const resolvedAddress = typeof address === "string" ? address.trim() : "";
    const resolvedChainId = String(chainId || "").trim();
    const shouldFetch = Boolean(symbol) || (Boolean(resolvedAddress) && resolvedAddress !== "native");
    const intervalMs = Math.min(60_000, Math.max(5_000, Number.isFinite(refreshMs) ? refreshMs : 30_000));

    let timer: ReturnType<typeof setInterval> | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const fetchLatestHttp = async () => {
      if (!shouldFetch || cancelled) return;
      try {
        if (resolvedAddress && resolvedAddress !== "native") {
          const params = new URLSearchParams({
            chainId: resolvedChainId || "1",
            address: resolvedAddress,
          });
          if (normalizedSymbol) {
            params.set("symbol", normalizedSymbol);
          }
          const response = await fetch(`/api/extension/market/asset-live?${params.toString()}`);
          if (!response.ok) return;

          const payload = (await response.json().catch(() => null)) as LiveAssetApiPayload | null;
          const nextPrice = typeof payload?.priceUsd === "number" ? payload.priceUsd : null;
          if (nextPrice === null || Number.isNaN(nextPrice)) return;

          if (cancelled) return;
          setPolledData((prev) => ({
            price: nextPrice,
            change24h:
              typeof payload?.change24hPct === "number" && Number.isFinite(payload.change24hPct)
                ? payload.change24hPct
                : prev.change24h,
            lastUpdate: Date.now(),
          }));
          return;
        }

        const ids = resolvedCoinId;
        const response = await fetch(`/api/assets/prices?ids=${encodeURIComponent(ids)}`);
        if (!response.ok) return;

        const rawPayload = (await response.json()) as UntypedJson;
        const payload = unwrapApiPayload<Record<string, PriceRecord>>(rawPayload) ?? {};
        const record = payload[ids] ?? payload[resolvedCoinId] ?? payload[normalizedSymbol];
        const nextPrice = record?.value;
        if (typeof nextPrice !== "number" || Number.isNaN(nextPrice)) return;

        if (cancelled) return;
        setPolledData((prev) => ({
          price: nextPrice,
          change24h: typeof record.priceChange24h === "number" ? record.priceChange24h : prev.change24h,
          lastUpdate: Date.now(),
        }));
      } catch {
        // Silently ignore polling network errors
      }
    };

    // Delay polling start by 5s — gives SSE time to connect first.
    // If SSE is already connected, polling never starts.
    delayTimer = setTimeout(() => {
      delayTimer = null;
      // Check SSE status at the time of delayed execution
      const currentState = useMarketPricesStore.getState();
      if (currentState.isConnected && currentState.prices[resolvedCoinId]) {
        // SSE is active and has data — skip polling entirely
        pollActiveRef.current = false;
        return;
      }

      // SSE failed to deliver data in time — start polling fallback
      pollActiveRef.current = true;
      if (shouldFetch) {
        void fetchLatestHttp();
        timer = setInterval(() => {
          // Stop polling if SSE catches up
          const state = useMarketPricesStore.getState();
          if (state.isConnected && state.prices[resolvedCoinId]) {
            pollActiveRef.current = false;
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            return;
          }
          void fetchLatestHttp();
        }, intervalMs);
      }
    }, POLL_DELAY_MS);

    return () => {
      cancelled = true;
      if (delayTimer) clearTimeout(delayTimer);
      if (timer) clearInterval(timer);
      pollActiveRef.current = false;
    };
  }, [address, chainId, normalizedSymbol, refreshMs, resolvedCoinId, symbol, testMode]);

  // ─── Merge: prefer SSE data over polled data ───────────────
  if (testMode) {
    return polledData;
  }

  if (ssePrice && ssePrice.price > 0) {
    return {
      price: ssePrice.price,
      change24h: ssePrice.change24h || polledData.change24h,
      lastUpdate: ssePrice.lastUpdate,
    };
  }

  return polledData;
}
