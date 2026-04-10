"use client";

import { memo } from "react";

import { YieldPoolsTable } from "@/components/market-overview/tables/yield-pools-table";
import { TrendingPoolsTable } from "@/components/market-overview/tables/trending-pools-table";
import { NewCoinsTable } from "@/components/market-overview/tables/new-coins-table";
import { SpotEtfFlowsTable } from "@/components/market-overview/tables/spot-etf-flows-table";
import { ExchangesTable } from "@/components/market-overview/tables/exchanges-table";
import { DerivativesExchangesTable } from "@/components/market-overview/tables/derivatives-exchanges-table";
import { NftMarketsTable } from "@/components/market-overview/tables/nft-markets-table";
import type {
  DefiLlamaYieldPool,
  TrendingPoolSummary,
  ExchangeSummary,
  DerivativesExchangeSummary,
  SpotEtfFlowRow,
  NftMarketRow,
  DexPairSummary,
} from "@/types/market";

type MarketTablesSectionProps = {
  yieldPools: DefiLlamaYieldPool[];
  trendingPools: TrendingPoolSummary[];
  freshPairs: DexPairSummary[];
  spotEtfFlows: SpotEtfFlowRow[];
  exchanges: ExchangeSummary[];
  nftMarkets: NftMarketRow[];
  yieldUpdatedLabel: string;
  trendingUpdatedLabel: string;
  freshPairsUpdatedLabel: string;
  spotEtfUpdatedLabel: string;
  exchangesUpdatedLabel: string;
  nftUpdatedLabel: string;
  isYieldLoading: boolean;
  isYieldError: boolean;
  isTrendingLoading: boolean;
  isTrendingError: boolean;
  isFreshPairsLoading: boolean;
  isFreshPairsError: boolean;
  isSpotEtfLoading: boolean;
  isSpotEtfError: boolean;
  isExchangesLoading: boolean;
  isExchangesError: boolean;
  derivatives: DerivativesExchangeSummary[];
  derivativesUpdatedLabel: string;
  isDerivativesLoading: boolean;
  isDerivativesError: boolean;
  isNftLoading: boolean;
  isNftError: boolean;
};

// Domain: market-overview
// Responsibility: Renders stacked market data tables for the overview page
// Depends on: YieldPoolsTable, TrendingPoolsTable, NewCoinsTable, ExchangesTable, DerivativesExchangesTable, NftMarketsTable

export const MarketTablesSection = memo(function MarketTablesSection({
  yieldPools,
  trendingPools,
  freshPairs,
  spotEtfFlows,
  exchanges,
  nftMarkets,
  yieldUpdatedLabel,
  trendingUpdatedLabel,
  freshPairsUpdatedLabel,
  spotEtfUpdatedLabel,
  exchangesUpdatedLabel,
  nftUpdatedLabel,
  isYieldLoading,
  isYieldError,
  isTrendingLoading,
  isTrendingError,
  isFreshPairsLoading,
  isFreshPairsError,
  isSpotEtfLoading,
  isSpotEtfError,
  isExchangesLoading,
  isExchangesError,
  derivatives,
  derivativesUpdatedLabel,
  isDerivativesLoading,
  isDerivativesError,
  isNftLoading,
  isNftError,
}: MarketTablesSectionProps) {
  return (
    <div className="space-y-10">
      {/* Fresh listings */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">discovery</p>
            <h2 className="text-lg font-medium text-foreground">Fresh listings</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {freshPairsUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <NewCoinsTable rows={freshPairs} isLoading={isFreshPairsLoading} isError={isFreshPairsError} />
        </div>
      </section>

      {/* US spot ETF flows */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">tradfi flows</p>
            <h2 className="text-lg font-medium text-foreground">US spot ETF flows</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {spotEtfUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <SpotEtfFlowsTable rows={spotEtfFlows} isLoading={isSpotEtfLoading} isError={isSpotEtfError} />
        </div>
      </section>

      {/* Spot exchanges */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">centralized liquidity</p>
            <h2 className="text-lg font-medium text-foreground">Spot exchanges</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {exchangesUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <ExchangesTable rows={exchanges} isLoading={isExchangesLoading} isError={isExchangesError} />
        </div>
      </section>

      {/* Top NFT collections */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">nft markets</p>
            <h2 className="text-lg font-medium text-foreground">Top NFT collections</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {nftUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <NftMarketsTable rows={nftMarkets} isLoading={isNftLoading} isError={isNftError} />
        </div>
      </section>

      {/* DeFi yield radar */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">defillama intelligence</p>
            <h2 className="text-lg font-medium text-foreground">DeFi yield radar</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {yieldUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <YieldPoolsTable pools={yieldPools} isLoading={isYieldLoading} isError={isYieldError} />
        </div>
      </section>

      {/* Trending pools list */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">onchain liquidity</p>
            <h2 className="text-lg font-medium text-foreground">Trending pools list</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {trendingUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <TrendingPoolsTable pools={trendingPools} isLoading={isTrendingLoading} isError={isTrendingError} />
        </div>
      </section>

      {/* Derivative venues to watch */}
      <section className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">perps open interest</p>
            <h2 className="text-lg font-medium text-foreground">Derivative venues to watch</h2>
          </div>
          <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/60">
            Updated {derivativesUpdatedLabel}
          </span>
        </div>
        <div className="w-full">
          <DerivativesExchangesTable rows={derivatives} isLoading={isDerivativesLoading} isError={isDerivativesError} />
        </div>
      </section>
    </div>
  );
});
