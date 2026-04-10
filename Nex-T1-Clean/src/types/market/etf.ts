export type SpotEtfAsset = "btc" | "eth";

export type SpotEtfFlowTotals = {
  asset: SpotEtfAsset;
  totalNetAssetsUsd: number | null;
  totalTokenHoldings: number | null;
  dailyNetInflowUsd: number | null;
  cumNetInflowUsd: number | null;
  dailyTotalValueTradedUsd: number | null;
  lastUpdateDate?: string | null;
};

export type SpotEtfFlowRow = {
  id: string;
  asset: SpotEtfAsset;
  ticker: string | null;
  institute: string | null;
  netAssetsUsd: number | null;
  netAssetsPercentage: number | null;
  totalTokenHoldings: number | null;
  dailyNetInflowUsd: number | null;
  cumNetInflowUsd: number | null;
  dailyValueTradedUsd: number | null;
  fee: number | null;
  discountPremiumRate: number | null;
  lastUpdateDate?: string | null;
};

export type SpotEtfFlows = {
  vendor: "sosovalue";
  totals: Record<SpotEtfAsset, SpotEtfFlowTotals>;
  rows: SpotEtfFlowRow[];
};

