"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────

export interface OnchainTrade {
  network: string;
  poolAddress: string;
  txHash: string;
  type: "buy" | "sell";
  tokenAmount: string;
  quoteAmount: string;
  volumeUsd: number;
  priceNative: number;
  priceUsd: number;
  timestamp: number;
}

interface UseOnchainTradeStreamOptions {
  /** Array of "network:poolAddress" strings */
  pools: string[];
  /** Max trades to keep in memory (default: 50) */
  maxTrades?: number;
  /** Whether the stream is enabled (default: true) */
  enabled?: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────

export function useOnchainTradeStream({
  pools,
  maxTrades = 50,
  enabled = true,
}: UseOnchainTradeStreamOptions) {
  const [trades, setTrades] = useState<OnchainTrade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Stabilize the pools key so the effect only re-runs when pool contents change
  const poolsKey = pools.map((p) => p.trim().toLowerCase()).join(",");

  useEffect(() => {
    if (!enabled || !poolsKey) {
      setIsConnected(false);
      return;
    }

    const poolsParam = poolsKey;
    const url = `/api/market/trades/stream?pools=${encodeURIComponent(poolsParam)}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === "connected") {
          setIsConnected(true);
          return;
        }

        if (parsed.type === "trade" && parsed.data) {
          const trade: OnchainTrade = {
            network: parsed.data.network ?? "",
            poolAddress: parsed.data.poolAddress ?? "",
            txHash: parsed.data.txHash ?? "",
            type: parsed.data.type === "sell" ? "sell" : "buy",
            tokenAmount: parsed.data.tokenAmount ?? "0",
            quoteAmount: parsed.data.quoteAmount ?? "0",
            volumeUsd: parsed.data.volumeUsd ?? 0,
            priceNative: parsed.data.priceNative ?? 0,
            priceUsd: parsed.data.priceUsd ?? 0,
            timestamp: parsed.data.timestamp ?? Date.now(),
          };

          setTrades((prev) => {
            const next = [trade, ...prev];
            return next.length > maxTrades ? next.slice(0, maxTrades) : next;
          });
        }
      } catch {
        // Silently ignore parse errors (keep-alive comments, etc.)
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [poolsKey, maxTrades, enabled]);

  return { trades, isConnected };
}
