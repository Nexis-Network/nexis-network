"use client";

import { useEffect, useMemo } from "react";
import { create } from "zustand";

// ─── Types ─────────────────────────────────────────────────────

export interface MarketPriceEntry {
  price: number;
  change24h: number;
  lastUpdate: number;
}

interface MarketPricesState {
  /** Coin-level price data keyed by CoinGecko ID (e.g. "ethereum") */
  prices: Record<string, MarketPriceEntry>;
  /** Reference count per coin ID — used to know when to open/close SSE */
  subscribers: Record<string, number>;
  /** Whether the shared SSE connection is active */
  isConnected: boolean;

  _reconnectAttempt: number;
  /** Mapping returned by the SSE "connected" event (symbol→coinId) */
  _resolvedMapping: Record<string, string>;
}

// Non-serializable / non-reactive refs live outside the store to avoid
// Zustand diffing objects that can never be meaningfully compared.
let _eventSource: EventSource | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let _pollTimer: ReturnType<typeof setInterval> | null = null;

interface MarketPricesActions {
  subscribe: (coinId: string) => void;
  unsubscribe: (coinId: string) => void;
  /** Internal: open/reconnect SSE with current subscriber list */
  _connect: () => void;
  /** Internal: gracefully close SSE */
  _disconnect: () => void;
  /** Internal: debounced reconnect after subscriber list changes */
  _scheduleReconnect: () => void;
}

type MarketPricesStore = MarketPricesState & MarketPricesActions;

// ─── Constants ─────────────────────────────────────────────────

const DEBOUNCE_MS = 500;
const CLEANUP_GRACE_MS = 5_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const REST_POLL_INTERVAL_MS = 15_000;
const SSE_ERROR_FALLBACK_THRESHOLD = 2;

function mergePriceSnapshot(
  currentPrices: Record<string, MarketPriceEntry>,
  data: Record<string, { value?: number }>,
): Record<string, MarketPriceEntry> | null {
  const nextPrices = { ...currentPrices };
  let changed = false;

  for (const [coinId, entry] of Object.entries(data)) {
    const price = typeof entry?.value === "number" ? entry.value : null;
    if (price == null || !Number.isFinite(price)) {
      continue;
    }

    nextPrices[coinId] = {
      price,
      change24h: nextPrices[coinId]?.change24h ?? 0,
      lastUpdate: Date.now(),
    };
    changed = true;
  }

  return changed ? nextPrices : null;
}

// ─── Store ─────────────────────────────────────────────────────

export const useMarketPricesStore = create<MarketPricesStore>((set, get) => ({
  prices: {},
  subscribers: {},
  isConnected: false,

  _reconnectAttempt: 0,
  _resolvedMapping: {},

  subscribe: (coinId: string) => {
    const normalized = coinId.trim().toLowerCase();
    if (!normalized) return;

    const state = get();
    const prev = state.subscribers[normalized] ?? 0;
    set({ subscribers: { ...state.subscribers, [normalized]: prev + 1 } });

    // Cancel any pending cleanup
    if (_cleanupTimer) {
      clearTimeout(_cleanupTimer);
      _cleanupTimer = null;
    }

    // Debounced reconnect to batch rapid subscribe calls
    state._scheduleReconnect();
  },

  unsubscribe: (coinId: string) => {
    const normalized = coinId.trim().toLowerCase();
    if (!normalized) return;

    const state = get();
    const prev = state.subscribers[normalized] ?? 0;
    if (prev <= 0) return;

    const next = prev - 1;
    const nextSubscribers = { ...state.subscribers };

    if (next <= 0) {
      delete nextSubscribers[normalized];
    } else {
      nextSubscribers[normalized] = next;
    }

    set({ subscribers: nextSubscribers });

    // If no subscribers remain, schedule cleanup with grace period
    if (Object.keys(nextSubscribers).length === 0) {
      _cleanupTimer = setTimeout(() => {
        const current = get();
        if (Object.keys(current.subscribers).length === 0) {
          current._disconnect();
        }
      }, CLEANUP_GRACE_MS);
    } else {
      // Reconnect to update subscription list (removed coin)
      state._scheduleReconnect();
    }
  },

  _scheduleReconnect: () => {
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
    }

    _debounceTimer = setTimeout(() => {
      _debounceTimer = null;
      get()._connect();
    }, DEBOUNCE_MS);
  },

  _connect: () => {
    const state = get();
    const coinIds = Object.keys(state.subscribers);

    if (coinIds.length === 0) {
      state._disconnect();
      return;
    }

    // Close existing connection before opening new one
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
      set({ isConnected: false });
    }

    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = null;
    }
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }

    const uniqueSorted = Array.from(new Set(coinIds)).sort().join(",");
    const url = `/api/market/stream?coins=${encodeURIComponent(uniqueSorted)}`;
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/api/assets/prices?ids=${encodeURIComponent(uniqueSorted)}`, {
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Price snapshot request failed with status ${response.status}`);
        }

        const json = (await response.json()) as {
          success?: boolean;
          data?: Record<string, { value?: number }>;
        };
        const nextPrices = mergePriceSnapshot(get().prices, json.data ?? {});
        if (nextPrices) {
          set({ prices: nextPrices, isConnected: true });
        }
      } catch {
        set({ isConnected: false });
      }
    };
    const startRestPolling = () => {
      void fetchSnapshot();
      _pollTimer = setInterval(() => {
        void fetchSnapshot();
      }, REST_POLL_INTERVAL_MS);
      set({ isConnected: true });
    };

    const es = new EventSource(url);
    _eventSource = es;

    es.onopen = () => {
      set({ isConnected: true, _reconnectAttempt: 0 });
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type?: string;
          mapping?: Record<string, string>;
          data?: Record<string, { price?: number; change_24h?: number } | number>;
        };

        // "connected" event includes symbol→coinId mapping
        if (parsed.type === "connected" && parsed.mapping) {
          set({ _resolvedMapping: { ...get()._resolvedMapping, ...parsed.mapping } });
          return;
        }

        if (parsed.type !== "update" || !parsed.data) return;

        const current = get();
        const nextPrices = { ...current.prices };
        let changed = false;

        for (const [key, val] of Object.entries(parsed.data)) {
          let price: number | null = null;
          let change24h: number | null = null;

          if (typeof val === "number") {
            price = val;
          } else if (val && typeof val === "object") {
            price = typeof val.price === "number" ? val.price : null;
            change24h = typeof val.change_24h === "number" ? val.change_24h : null;
          }

          if (price !== null && Number.isFinite(price)) {
            nextPrices[key] = {
              price,
              change24h: change24h ?? nextPrices[key]?.change24h ?? 0,
              lastUpdate: Date.now(),
            };
            changed = true;
          }
        }

        if (changed) {
          set({ prices: nextPrices });
        }
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    es.onerror = () => {
      // Close the failed connection
      es.close();
      if (_eventSource === es) {
        _eventSource = null;
        set({ isConnected: false });
      }

      const current = get();
      const nextAttempt = current._reconnectAttempt + 1;
      if (nextAttempt >= SSE_ERROR_FALLBACK_THRESHOLD) {
        set({ _reconnectAttempt: nextAttempt });
        startRestPolling();
        return;
      }

      // Exponential backoff reconnect
      if (Object.keys(current.subscribers).length > 0) {
        const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** current._reconnectAttempt);
        _reconnectTimer = setTimeout(() => {
          _reconnectTimer = null;
          set({ _reconnectAttempt: nextAttempt });
          get()._connect();
        }, delay);
      }
    };
  },

  _disconnect: () => {
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = null;
    }
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }
    if (_cleanupTimer) {
      clearTimeout(_cleanupTimer);
      _cleanupTimer = null;
    }
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
    set({
      _reconnectAttempt: 0,
      isConnected: false,
    });
  },
}));

// ─── Selector hook for individual coin prices ──────────────────

/**
 * Subscribe to real-time price updates for a single coin via the shared SSE connection.
 * Automatically manages reference counting — first subscriber opens the connection,
 * last unsubscribe closes it (after a 5s grace period).
 */
export function useMarketPrice(coinId: string): MarketPriceEntry | null {
  const subscribe = useMarketPricesStore((s) => s.subscribe);
  const unsubscribe = useMarketPricesStore((s) => s.unsubscribe);
  const entry = useMarketPricesStore((s) => s.prices[coinId.trim().toLowerCase()] ?? null);

  useEffect(() => {
    const normalized = coinId.trim().toLowerCase();
    if (!normalized) return;
    subscribe(normalized);
    return () => unsubscribe(normalized);
  }, [coinId, subscribe, unsubscribe]);

  return entry;
}

/**
 * Subscribe to real-time prices for multiple coins.
 * Returns a record of coinId → price data.
 */
export function useMarketPrices(coinIds: string[]): {
  data: Record<string, MarketPriceEntry>;
  isConnected: boolean;
} {
  const subscribe = useMarketPricesStore((s) => s.subscribe);
  const unsubscribe = useMarketPricesStore((s) => s.unsubscribe);
  const prices = useMarketPricesStore((s) => s.prices);
  const isConnected = useMarketPricesStore((s) => s.isConnected);

  const normalizedIds = useMemo(
    () => coinIds.map((id) => id.trim().toLowerCase()).filter(Boolean),
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

  const data = useMemo(() => {
    const result: Record<string, MarketPriceEntry> = {};
    for (const id of normalizedIds) {
      if (prices[id]) {
        result[id] = prices[id];
      }
    }
    return result;
  }, [normalizedIds, prices]);

  return { data, isConnected };
}
