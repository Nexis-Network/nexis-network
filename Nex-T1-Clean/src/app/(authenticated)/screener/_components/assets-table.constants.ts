import type { SWRConfiguration } from "swr";
import type { CSSProperties } from "react";

import type { AssetsTableSortConfig } from "./assets-table.types";

export const DEFAULT_PAIR_IMAGE =
  "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png";
export const MAX_LIVE_VISIBLE_IDS = 24;
export const ASSETS_TABLE_PAGE_SIZE = 100;
export const INITIAL_HISTORY_PREFETCH_COUNT = 20;
export const SCREENER_TABLE_SURFACE_CLASS = "screener-table-surface";
export const SCREENER_TABLE_SCROLL_AREA_CLASS =
  "min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain no-scrollbar [scrollbar-gutter:stable]";
export const ASSETS_TABLE_GRID_CLASS =
  "grid grid-cols-[minmax(165px,2fr)_minmax(80px,1fr)_minmax(60px,0.8fr)_minmax(60px,0.8fr)_minmax(80px,0.9fr)_minmax(80px,0.9fr)_minmax(100px,1.4fr)_minmax(90px,1.1fr)_minmax(90px,1.1fr)_minmax(80px,0.9fr)_minmax(70px,0.8fr)_minmax(50px,0.5fr)_minmax(60px,0.7fr)_minmax(60px,0.7fr)_minmax(80px,0.8fr)] gap-3";
export const SCREENER_TABLE_STICKY_LEFT_SURFACE_CLASS =
  "bg-[var(--screener-table-surface)] transition-colors group-hover:bg-[var(--screener-table-row-hover)]";
export const SCREENER_TABLE_STICKY_RIGHT_SURFACE_CLASS =
  "bg-[var(--screener-table-surface)] shadow-[var(--screener-table-sticky-shadow)] transition-colors group-hover:bg-[var(--screener-table-row-hover)]";

export const DEFAULT_SORT_CONFIG: AssetsTableSortConfig = {
  key: "marketCap",
  direction: "desc",
};

export const MARKET_QUERY_SWR_CONFIG = {
  refreshInterval: 60_000,
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 10_000,
  keepPreviousData: true,
} satisfies SWRConfiguration;

export const LIVE_PRICES_SWR_CONFIG = {
  refreshInterval: 10_000,
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 5_000,
  keepPreviousData: true,
} satisfies SWRConfiguration;

export const HISTORY_SWR_CONFIG = {
  refreshInterval: 60_000,
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  dedupingInterval: 30_000,
  keepPreviousData: true,
} satisfies SWRConfiguration;

export const ENRICHMENT_SWR_CONFIG = {
  dedupingInterval: 300_000,
  keepPreviousData: true,
  refreshInterval: 0,
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} satisfies SWRConfiguration;

const COMPACT_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
});

const COMPACT_PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  notation: "compact",
});

export function formatCompactUsd(value: number): string {
  return COMPACT_USD_FORMATTER.format(value);
}

export function formatCompactPrice(value: number): string {
  return COMPACT_PRICE_FORMATTER.format(value);
}

export type ScreenerSignalBadge = {
  label: string;
  style: CSSProperties;
};
