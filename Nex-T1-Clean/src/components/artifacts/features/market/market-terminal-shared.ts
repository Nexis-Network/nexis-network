import type {
  MarketTerminalScreenerRow,
  MarketTerminalTradeRow,
} from "@/modules/shared/artifacts/market-terminal";

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const wholeCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const tradeTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const CHAIN_OPTIONS = [
  { value: "all", label: "All chains" },
  { value: "ethereum", label: "Ethereum" },
  { value: "solana", label: "Solana" },
  { value: "base", label: "Base" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
] as const;

export const SORT_PRESET_OPTIONS = [
  { value: "marketCap:desc", label: "Market cap desc" },
  { value: "volume24h:desc", label: "Volume desc" },
  { value: "change24hPct:desc", label: "24H gainers" },
  { value: "change24hPct:asc", label: "24H losers" },
] as const;

export const MARKET_TERMINAL_DEFAULT_LIMIT = 100;
export const MARKET_TERMINAL_LIVE_PRICE_LIMIT = 25;

export const MARKET_TERMINAL_DIMENSIONS = [
  { id: "symbol", name: "Symbol", type: "string" },
  { id: "name", name: "Name", type: "string" },
  { id: "chain", name: "Chain", type: "string" },
  { id: "narrative", name: "Narrative", type: "string" },
  { id: "price", name: "Price", type: "number" },
  { id: "change24hPct", name: "24H", type: "number" },
  { id: "marketCap", name: "Market Cap", type: "number" },
  { id: "volume24h", name: "Volume", type: "number" },
  { id: "liquidityScore", name: "Liquidity", type: "number" },
  { id: "auditScore", name: "Audit", type: "number" },
  { id: "socialDominance", name: "Social", type: "number" },
] as const;

export function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return value >= 100
    ? wholeCurrencyFormatter.format(value)
    : preciseCurrencyFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return compactCurrencyFormatter.format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatTradeTime(timestamp: number) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return tradeTimeFormatter.format(parsed);
}

export function normalizePoolsInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function getSelectedAsset(
  rows: MarketTerminalScreenerRow[],
  selectedAssetId: string | null,
): MarketTerminalScreenerRow | null {
  if (!selectedAssetId) {
    return null;
  }

  return rows.find((row) => row.assetId === selectedAssetId) ?? null;
}

export function getVisibleScreenerRows(
  rows: MarketTerminalScreenerRow[],
  limit = MARKET_TERMINAL_DEFAULT_LIMIT,
): MarketTerminalScreenerRow[] {
  return rows.slice(0, limit);
}

export type TradeTapeRowLike = Pick<
  MarketTerminalTradeRow,
  | "id"
  | "timestamp"
  | "side"
  | "network"
  | "priceUsd"
  | "volumeUsd"
  | "tokenAmount"
  | "quoteAmount"
  | "poolAddress"
  | "txHash"
>;
