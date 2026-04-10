import type { ChartTimeframe } from "@/server/actions/market-data";
import type { AssetPageTab } from "@/components/assets/asset-client-view/asset-page.types";

export const ASSET_PAGE_TIMEFRAMES: ChartTimeframe[] = ["1H", "1D", "1W", "1M", "1Y"];

export const ASSET_PAGE_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1H",
  "2H",
  "4H",
  "6H",
  "12H",
  "1D",
  "3D",
  "1W",
] as const;

export const ASSET_PAGE_TABS: Array<{ key: AssetPageTab; label: string }> = [
  { key: "transactions", label: "Transactions" },
  { key: "pools", label: "Pools" },
  { key: "holders", label: "Holders" },
  { key: "vesting", label: "Vesting" },
  { key: "sales", label: "Public Sales" },
  { key: "funding", label: "Funding Rounds" },
];
