import type { Dispatch, SetStateAction } from "react";
import type { CoinMarketRow } from "@/types/market/market-data";
import type { WatchlistEnrichmentSnapshot } from "@/types/watchlist";

export type AssetsTableSortKey =
  | keyof CoinMarketRow
  | "name"
  | "signal"
  | "auditScore"
  | "narrative"
  | "socialDominance";

export type AssetsTableSortConfig = {
  key: AssetsTableSortKey;
  direction: "asc" | "desc" | null;
};

export type AssetHistoryMap = Record<string, number[]>;
export type AssetEnrichmentMap = Record<string, WatchlistEnrichmentSnapshot>;
export type RealtimePriceMap = Record<string, UntypedJson>;
export type StreamPriceMap = Record<string, { price?: number; change_24h?: number }>;

export type AssetRowRefSetter = (node: HTMLElement | null, id: string) => void;

export type UseAssetsTableDataArgs = {
  narrativeFilter: string;
  safetyFilter: boolean;
  searchQuery: string;
  selectedChain: string;
  setCurrentViewData: (assets: CoinMarketRow[]) => void;
};

export type UseAssetsTableDataResult = {
  displayAssets: CoinMarketRow[];
  handleSort: (key: AssetsTableSortKey) => void;
  initialAssets: CoinMarketRow[];
  isLoading: boolean;
  limit: number;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  setRowRef: AssetRowRefSetter;
  sortConfig: AssetsTableSortConfig;
};
