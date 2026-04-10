import type { ChartTimeframeOption } from "../price-chart-panel";

export const TABS = [
  { id: "overview", label: "Overview", target: "overview" },
  { id: "markets", label: "Markets", target: "markets" },
  { id: "onchain", label: "On-chain", target: "onchain" },
  { id: "tokenomics", label: "Tokenomics", target: "tokenomics" },
  { id: "news", label: "News", target: "news" },
] as const;

export const TOKEN_TIMEFRAMES: ChartTimeframeOption[] = [
  { id: "1D", label: "1D", days: 1, interval: "hourly" },
  { id: "5D", label: "5D", days: 5, interval: "hourly" },
  { id: "1M", label: "1M", days: 30, interval: "daily" },
  { id: "6M", label: "6M", days: 180, interval: "daily" },
  { id: "YTD", label: "YTD", days: 200, interval: "daily" },
  { id: "1Y", label: "1Y", days: 365, interval: "daily" },
  { id: "5Y", label: "5Y", days: 1825, interval: "daily" },
  { id: "MAX", label: "MAX", days: "max" },
];

export const NFT_TIMEFRAMES: ChartTimeframeOption[] = [
  { id: "1D", label: "1D", days: 1 },
  { id: "7D", label: "7D", days: 7 },
  { id: "30D", label: "30D", days: 30 },
  { id: "90D", label: "90D", days: 90 },
  { id: "MAX", label: "MAX", days: "max" },
];
