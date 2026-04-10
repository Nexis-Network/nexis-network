"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, SlidersHorizontal } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAssetSnapshot } from "@/hooks/market/use-asset-snapshot";
import { useCoinMarketChart, useNftMarketChart } from "@/hooks/market";
import { useToast } from "@/components/ui/use-toast";
import { useWatchlist } from "@/hooks/watchlist/use-watchlist";
import type {
  AssetSnapshotResponse,
  CompareAssetSearchItem,
} from "@/types/token-page";

import { AssetHero } from "./asset-hero";
import { AssetCompareSearch } from "./asset-compare-search";
import { AssetCompareTable, type ComparisonRow } from "./asset-compare-table";
import { DexLiquidityCard } from "./dex-liquidity-card";
import { FundamentalsCard } from "./fundamentals-card";
import { KeyThemesCard } from "./key-themes-card";
import { MetricsGrid } from "./metrics-grid";
import { PeersCard } from "./peers-card";
import PriceChartPanel, { type ChartTimeframeOption, type PriceChartSeries, type PriceStatSnapshot } from "./price-chart-panel";
import { PriceMovementTimeline } from "./price-movement-timeline";
import { TokenMoversCard } from "./token-movers-card";
import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, TOKEN_RIGHT_RAIL_WIDTH_CLASS } from "./constants";
import { CreateWatchlistCard } from "@/components/market-overview/right-rail/create-watchlist-card";
import { PriceStatCard } from "./price-stat-card";
import { TokenAiInsightsPanel } from "./ai-insights-panel";
import TechnicalAnalysisWidget from "./technical-analysis-widget";
import { MoralisPriceChart } from "@/components/moralis/moralis-price-chart";

import { TABS, TOKEN_TIMEFRAMES, NFT_TIMEFRAMES } from "./token-asset-page/constants";
import { buildPriceSummary, buildMetricsMatrix, buildTimelineEntries, buildKeyThemes, buildFundamentalsFields, formatDexSource, tokenPageErrorMessage } from "./token-asset-page/data-builders";
import { buildChartPoints, computeSeriesStats, resolveNativeSymbol } from "./token-asset-page/use-token-chart-data";

export type { PriceSummary } from "./token-asset-page/data-builders";

type TokenAssetPageProps = {
  assetType: "token" | "nft";
  slug: string;
  initialSnapshot: AssetSnapshotResponse | null;
};

export function TokenAssetPage({ assetType, slug, initialSnapshot }: TokenAssetPageProps) {
  const sectionRefs: Record<(typeof TABS)[number]["target"], React.MutableRefObject<HTMLDivElement | null>> = {
    overview: useRef<HTMLDivElement | null>(null),
    markets: useRef<HTMLDivElement | null>(null),
    onchain: useRef<HTMLDivElement | null>(null),
    tokenomics: useRef<HTMLDivElement | null>(null),
    news: useRef<HTMLDivElement | null>(null),
  };

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const timeframeOptions = assetType === "nft" ? NFT_TIMEFRAMES : TOKEN_TIMEFRAMES;
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframeOption>(timeframeOptions[2] ?? timeframeOptions[0]);
  const [priceStat, setPriceStat] = useState<PriceStatSnapshot | null>(null);
  const [comparison, setComparison] = useState<{ assetType: "token" | "nft"; slug: string } | null>(null);
  useEffect(() => {
    setComparison(null);
  }, [assetType, slug]);

  const snapshotQuery = useAssetSnapshot({ assetType, slug, initialData: initialSnapshot ?? undefined });
  const { toast } = useToast();
  const watchlist = useWatchlist("usd");
  const showWatchlistAuthToast = () => {
    toast({
      title: "Sign in to save watchlists",
      description: "Create an account to sync personalized alerts across devices.",
    });
  };

  const handleRemoveWatchlistItem = async (itemId: string) => {
    if (!watchlist.isAuthenticated) {
      showWatchlistAuthToast();
      return;
    }
    try {
      await watchlist.removeItem(itemId);
      toast({ title: "Removed from watchlist" });
    } catch (error) {
      toast({
        title: "Unable to update watchlist",
        description: tokenPageErrorMessage(error),
        variant: "destructive",
      });
    }
  };
  const snapshot = snapshotQuery.data?.data ?? null;
  const isToken = snapshot?.kind === "token";

  const normalizedSlug = slug.toLowerCase();
  const isContractStyleSlug = normalizedSlug.startsWith("evm-") || normalizedSlug.startsWith("solana-");
  const snapshotSlugIsContractStyle = snapshot?.kind === "token"
    ? snapshot.slug.toLowerCase().startsWith("evm-") || snapshot.slug.toLowerCase().startsWith("solana-")
    : false;
  const useMoralisContractChart = assetType === "token" && isContractStyleSlug && (!snapshot || snapshotSlugIsContractStyle);
  const tokenChartId = snapshot?.kind === "token" ? snapshot.slug : slug;
  const tokenChartEnabled = assetType === "token" && (!isContractStyleSlug || (snapshot?.kind === "token" && !snapshotSlugIsContractStyle));

  const tokenChartQuery = useCoinMarketChart(
    tokenChartId,
    {
      vsCurrency: "usd",
      days: chartTimeframe.days,
      interval: chartTimeframe.interval,
    },
    tokenChartEnabled,
  );

  const snapshotNftChart = snapshot?.kind === "nft" && snapshot.chart?.timeframeId === chartTimeframe.id
    ? snapshot.chart.data
    : null;

  const shouldFetchNftChart = assetType === "nft"
    ? !snapshotNftChart
    : false;

  const nftChartQuery = useNftMarketChart(
    slug,
    {
      vsCurrency: "usd",
      days: chartTimeframe.days ?? 30,
    },
    shouldFetchNftChart,
  );

  const comparisonSnapshotQuery = useAssetSnapshot({
    assetType: comparison?.assetType ?? "token",
    slug: comparison?.slug ?? "",
    enabled: Boolean(comparison?.slug),
  });
  const comparisonSnapshot = comparisonSnapshotQuery.data?.data ?? null;
  const comparisonTokenChartQuery = useCoinMarketChart(
    comparison?.slug ?? "",
    {
      vsCurrency: "usd",
      days: chartTimeframe.days,
      interval: chartTimeframe.interval,
    },
    Boolean(comparison?.slug && comparison?.assetType === "token"),
  );

  const comparisonHasSnapshotChart = comparisonSnapshot?.kind === "nft"
    ? comparisonSnapshot.chart?.timeframeId === chartTimeframe.id
    : false;

  const comparisonShouldFetchNftChart = comparison?.assetType === "nft"
    ? !comparisonHasSnapshotChart
    : false;

  const comparisonNftChartQuery = useNftMarketChart(
    comparison?.slug ?? "",
    {
      vsCurrency: "usd",
      days: chartTimeframe.days ?? 30,
    },
    comparisonShouldFetchNftChart,
  );

  const comparisonActiveChartData = comparison?.assetType === "token"
    ? comparisonTokenChartQuery.data?.data ?? null
    : comparisonHasSnapshotChart
      ? comparisonSnapshot?.kind === "nft" ? comparisonSnapshot.chart?.data ?? null : null
      : comparisonNftChartQuery.data?.data ?? null;

  const comparisonChartPoints = useMemo(
    () => buildChartPoints(comparisonActiveChartData, comparison?.assetType ?? "token"),
    [comparisonActiveChartData, comparison?.assetType],
  );

  const chartError = isToken ? tokenChartQuery.error : nftChartQuery.error;

  const comparisonChartIsLoading = comparison?.assetType === "token"
    ? comparisonTokenChartQuery.isLoading
    : comparisonShouldFetchNftChart && comparisonNftChartQuery.isLoading;

  const activeChartData = isToken
    ? tokenChartQuery.data?.data ?? null
    : snapshotNftChart ?? nftChartQuery.data?.data ?? null;
  const chartData = useMemo(() => buildChartPoints(activeChartData, assetType), [activeChartData, assetType]);
  const chartSeries = useMemo<PriceChartSeries[]>(() => {
    const entries: PriceChartSeries[] = [];
    const baseName = snapshot?.name ?? slug;
    const baseSymbol = snapshot?.kind === "token"
      ? snapshot.symbol
      : snapshot?.kind === "nft"
        ? snapshot.symbol
        : slug.toUpperCase();
    const baseLogo = snapshot?.kind === "token" || snapshot?.kind === "nft"
      ? snapshot.imageUrl ?? null
      : null;

    entries.push({
      id: `${assetType}:${slug}`,
      assetType,
      name: baseName,
      symbol: baseSymbol,
      points: chartData,
      logoUrl: baseLogo,
      isPrimary: true,
    });

    if (comparison && comparisonChartPoints.length) {
      const { assetType: compareType, slug: compareSlug } = comparison;
      let compareName = compareSlug;
      let compareSymbol = compareSlug.toUpperCase();
      let compareLogo: string | null = null;

      if (comparisonSnapshot?.kind === "token") {
        compareName = comparisonSnapshot.name;
        compareSymbol = comparisonSnapshot.symbol;
        compareLogo = comparisonSnapshot.imageUrl ?? null;
      } else if (comparisonSnapshot?.kind === "nft") {
        compareName = comparisonSnapshot.name;
        compareSymbol = comparisonSnapshot.symbol;
        compareLogo = comparisonSnapshot.imageUrl ?? null;
      }

      entries.push({
        id: `${compareType}:${compareSlug}`,
        assetType: compareType,
        name: compareName,
        symbol: compareSymbol,
        points: comparisonChartPoints,
        logoUrl: compareLogo,
        isPrimary: false,
      });
    }

    return entries;
  }, [assetType, chartData, comparison, comparisonChartPoints, comparisonSnapshot, snapshot, slug]);
  const primaryStats = useMemo(() => computeSeriesStats(chartData), [chartData]);
  const comparisonStats = useMemo(() => computeSeriesStats(comparisonChartPoints), [comparisonChartPoints]);
  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    const rows: ComparisonRow[] = [];

    const baseLogo = snapshot?.kind === "token" || snapshot?.kind === "nft" ? snapshot.imageUrl ?? null : null;
    const baseName = snapshot?.name ?? slug;
    const baseSymbol = snapshot?.kind === "token"
      ? snapshot.symbol
      : snapshot?.kind === "nft"
        ? snapshot.symbol
        : slug.toUpperCase();
    const baseFallbackPriceUsd = snapshot?.kind === "token"
      ? snapshot.marketData.priceUsd ?? null
      : snapshot?.kind === "nft"
        ? snapshot.floorPriceUsd ?? null
        : null;
    const basePriceUsd = primaryStats.latestPrice ?? baseFallbackPriceUsd;
    const basePriceNative = snapshot?.kind === "nft" ? snapshot.floorPriceNative ?? null : null;
    const baseNativeSymbol = snapshot?.kind === "nft" ? resolveNativeSymbol(snapshot.blockchains) : null;
    const basePercent = primaryStats.deltaPercent ?? (snapshot?.kind === "token" ? snapshot.marketData.priceChangePercent24h ?? null : null);
    const baseAbsolute = primaryStats.deltaAbsolute ?? (
      basePriceUsd != null && basePercent != null ? (basePriceUsd * basePercent) / 100 : null
    );
    const baseMeta = snapshot?.kind === "token"
      ? snapshot.networks[0]?.chain?.toUpperCase()
      : snapshot?.kind === "nft"
        ? snapshot.blockchains[0]?.toUpperCase()
        : null;

    rows.push({
      id: `${assetType}:${slug}`,
      assetType,
      name: baseName,
      symbol: baseSymbol,
      logoUrl: baseLogo,
      priceUsd: basePriceUsd,
      priceNative: basePriceNative,
      nativeSymbol: baseNativeSymbol,
      deltaUsd: baseAbsolute,
      deltaPercent: basePercent,
      meta: baseMeta,
      isPrimary: true,
    });

    if (comparison) {
      const compareType = comparison.assetType;
      const compareSlug = comparison.slug;
      const snapshotData = comparisonSnapshot;
      const compareLogo = snapshotData?.kind === "token" || snapshotData?.kind === "nft"
        ? snapshotData.imageUrl ?? null
        : null;
      const compareName = snapshotData?.name ?? compareSlug;
      const compareSymbol = snapshotData?.kind === "token"
        ? snapshotData.symbol
        : snapshotData?.kind === "nft"
          ? snapshotData.symbol
          : compareSlug.toUpperCase();
      const compareFallbackPriceUsd = snapshotData?.kind === "token"
        ? snapshotData.marketData.priceUsd ?? null
        : snapshotData?.kind === "nft"
          ? snapshotData.floorPriceUsd ?? null
          : null;
      const comparePriceUsd = comparisonStats.latestPrice ?? compareFallbackPriceUsd;
      const comparePriceNative = snapshotData?.kind === "nft" ? snapshotData.floorPriceNative ?? null : null;
      const compareNativeSymbol = snapshotData?.kind === "nft" ? resolveNativeSymbol(snapshotData.blockchains) : null;
      const comparePercent = comparisonStats.deltaPercent ?? (
        snapshotData?.kind === "token" ? snapshotData.marketData.priceChangePercent24h ?? null : null
      );
      const compareAbsolute = comparisonStats.deltaAbsolute ?? (
        comparePriceUsd != null && comparePercent != null ? (comparePriceUsd * comparePercent) / 100 : null
      );
      const compareMeta = snapshotData?.kind === "token"
        ? snapshotData.networks[0]?.chain?.toUpperCase()
        : snapshotData?.kind === "nft"
          ? snapshotData.blockchains[0]?.toUpperCase()
          : null;

      rows.push({
        id: `${compareType}:${compareSlug}`,
        assetType: compareType,
        name: compareName,
        symbol: compareSymbol,
        logoUrl: compareLogo,
        priceUsd: comparePriceUsd,
        priceNative: comparePriceNative,
        nativeSymbol: compareNativeSymbol,
        deltaUsd: compareAbsolute,
        deltaPercent: comparePercent,
        meta: compareMeta,
        isPrimary: false,
      });
    }

    return rows;
  }, [assetType, comparison, comparisonSnapshot, comparisonStats, primaryStats, slug, snapshot]);
  const handleSelectComparison = useCallback(
    (item: CompareAssetSearchItem) => {
      const normalizedSlug = item.slug?.trim().toLowerCase();
      if (!normalizedSlug) {
        return;
      }
      if (normalizedSlug === slug && item.assetType === assetType) {
        return;
      }
      setComparison({ assetType: item.assetType, slug: normalizedSlug });
    },
    [assetType, slug],
  );
  const handleRemoveComparison = useCallback(() => {
    setComparison(null);
  }, []);
  const comparisonExcludeIds = useMemo(() => {
    const ids = [`${assetType}:${slug}`];
    if (comparison) {
      ids.push(`${comparison.assetType}:${comparison.slug}`);
    }
    return ids;
  }, [assetType, slug, comparison]);
  const chartIsLoading = (isToken ? tokenChartQuery.isLoading : !snapshotNftChart && nftChartQuery.isLoading)
    || comparisonChartIsLoading;
  const priceSummary = useMemo(() => buildPriceSummary(snapshot), [snapshot]);
  const metricsMatrix = useMemo(() => buildMetricsMatrix(snapshot), [snapshot]);
  const timelineEntries = useMemo(() => buildTimelineEntries(snapshot), [snapshot]);
  const keyThemes = useMemo(() => buildKeyThemes(snapshot), [snapshot]);
  const fundamentals = useMemo(() => buildFundamentalsFields(snapshot), [snapshot]);
  const peers = useMemo(() => (snapshot?.kind === "token" ? snapshot.peers : snapshot?.peers) ?? [], [snapshot]);
  const peerSuggestions = useMemo<CompareAssetSearchItem[]>(() => {
    if (!peers.length) {
      return [];
    }
    return peers
      .filter((peer) => peer.slug)
      .map((peer) => {
        const priceUsd = peer.priceUsd ?? null;
        const percent = peer.priceChangePercent24h ?? null;
        const priceChangeUsd24h = priceUsd != null && percent != null ? (priceUsd * percent) / 100 : null;
        const assetType = peer.entityType === "nft" ? "nft" : "token";
        return {
          id: peer.id,
          slug: peer.slug,
          name: peer.name,
          symbol: peer.symbol,
          assetType,
          logoUrl: peer.logoUrl ?? null,
          priceUsd,
          priceChangePercent24h: percent,
          priceChangeUsd24h,
          marketCapRank: null,
        } satisfies CompareAssetSearchItem;
      });
  }, [peers]);

  const hasSnapshot = Boolean(snapshot);

  const handleTabChange = (tabId: string) => {
    const nextTab = TABS.find((tab) => tab.id === tabId);
    if (!nextTab) {
      return;
    }
    setActiveTab(nextTab.id);
    const ref = sectionRefs[nextTab.target];
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dexPairs = snapshot && snapshot.kind === "token" ? snapshot.dexPairs : [];
  const dexSource = snapshot && snapshot.kind === "token" ? formatDexSource(snapshot.dexPairsSource) : "Dex feeds";
  const moralisContractChartParams = useMemo(() => {
    if (!isContractStyleSlug) return null;
    const lower = normalizedSlug;
    if (lower.startsWith("evm-")) {
      const parts = slug.split("-");
      if (parts.length < 3) return null;
      const chainId = parts[1]?.toLowerCase();
      const tokenAddress = parts.slice(2).join("-");
      if (!chainId || !tokenAddress) return null;
      return { chainId, tokenAddress };
    }
    if (lower.startsWith("solana-")) {
      const tokenAddress = slug.slice("solana-".length);
      return tokenAddress ? { chainId: "solana", tokenAddress } : null;
    }
    return null;
  }, [isContractStyleSlug, normalizedSlug, slug]);

  return (
    <DashboardShell>
      <div className="flex h-full flex-col overflow-hidden border border-border/10 bg-background">
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 overflow-y-auto px-4 pb-10 pt-6 sm:px-6">
          {!hasSnapshot ? (
            <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, "text-sm text-destructive")}>
              <div className={cn(TOKEN_PANEL_INNER_CLASS, "rounded-[11px] p-6")}>
                Unable to load asset data for <span className="font-semibold">{slug}</span>. Please try again later.
              </div>
            </Card>
          ) : null}

          <div className="grid justify-center gap-8 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
            <div className="w-full min-w-0 space-y-8">
              {snapshot ? (
                <AssetHero
                  snapshot={snapshot}
                  priceSummary={priceSummary}
                  tabs={TABS}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  isRefreshing={snapshotQuery.isFetching}
                />
              ) : (
                <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS)}>
                  <div className={cn(TOKEN_PANEL_INNER_CLASS, "rounded-[11px] p-6 space-y-4")}>
                    <Skeleton className="h-8 w-60" />
                    <Skeleton className="h-6 w-80" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </Card>
              )}

              <div ref={sectionRefs.markets}>
                {priceStat ? (
                  <div className="mb-8">
                    <PriceStatCard {...priceStat} />
                  </div>
                ) : null}
                {useMoralisContractChart && moralisContractChartParams ? (
                  <MoralisPriceChart
                    chainId={moralisContractChartParams.chainId}
                    tokenAddress={moralisContractChartParams.tokenAddress}
                    height={420}
                    autoSize
                  />
                ) : (
                  <PriceChartPanel
                    series={chartSeries}
                    timeframe={chartTimeframe.id}
                    options={timeframeOptions}
                    onChangeTimeframe={(timeframeId) => {
                      const next = timeframeOptions.find((option) => option.id === timeframeId) ?? timeframeOptions[0];
                      setChartTimeframe(next);
                    }}
                    isLoading={chartIsLoading}
                    isError={isToken ? tokenChartQuery.isError : nftChartQuery.isError}
                    error={chartError}
                    onPriceStatChange={setPriceStat}
                    dailyHigh={snapshot?.kind === "token" ? snapshot.marketData.high24hUsd ?? null : null}
                    dailyLow={snapshot?.kind === "token" ? snapshot.marketData.low24hUsd ?? null : null}
                    primaryAssetId={slug}
                    vsCurrency="usd"
                  />
                )}
                <div className="mt-4">
                  <AssetCompareSearch
                    onSelect={handleSelectComparison}
                    excludeIds={comparisonExcludeIds}
                    suggestions={peerSuggestions}
                  />
                </div>
                {comparisonRows.length > 1 ? (
                  <div className="mt-4">
                    <AssetCompareTable rows={comparisonRows} onRemove={handleRemoveComparison} />
                  </div>
                ) : null}
              </div>

              <div ref={sectionRefs.overview}>
                {metricsMatrix.length ? <MetricsGrid rows={metricsMatrix} /> : null}
                {snapshot?.kind === "token" ? (
                  <div className="mt-6">
                    <DexLiquidityCard pairs={dexPairs} source={dexSource} />
                  </div>
                ) : null}
              </div>

              <div ref={sectionRefs.news} className="space-y-3">
                <TokenAiInsightsPanel snapshot={snapshot} assetType={assetType} />
              </div>

              <div ref={sectionRefs.onchain}>
                <PriceMovementTimeline entries={timelineEntries} />
              </div>

              <div ref={sectionRefs.tokenomics}>
                <KeyThemesCard themes={keyThemes} />
              </div>
            </div>

            <div className={cn("space-y-6 self-start", TOKEN_RIGHT_RAIL_WIDTH_CLASS)}>
              <FundamentalsCard fields={fundamentals.fields} description={fundamentals.description} />
              <div className="space-y-2">
                <div className="flex items-center justify-between px-[16px]">
                  <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground">
                    Create Watchlist
                  </span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-transparent text-foreground hover:border-border/80"
                  >
                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <CreateWatchlistCard
                  currency="usd"
                  items={watchlist.items}
                  isAuthenticated={watchlist.isAuthenticated}
                  isLoading={watchlist.isLoading}
                  isMutating={watchlist.isMutating}
                  onRemove={handleRemoveWatchlistItem}
                  variant="token"
                  hideHeader
                />
              </div>
              <div className="space-y-2">
                <p className="px-[2px] text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground">Technical Analysis</p>
                <TechnicalAnalysisWidget symbol={`BINANCE:${snapshot?.symbol ?? slug}USDT`} />
              </div>
              <TokenMoversCard />
              <div className="space-y-2">
                <p className="px-[2px] text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground">Peers</p>
                <PeersCard peers={peers} />
              </div>
            </div>
          </div>

          {snapshotQuery.data?.errors?.length ? (
            <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, "text-sm text-muted-foreground")}>
              <div className={cn(TOKEN_PANEL_INNER_CLASS, "flex items-center gap-3 rounded-[11px] p-4")}>
                <AlertTriangle className="size-4 text-amber-400" />
                <span>Live data partially degraded: {snapshotQuery.data.errors.join(" · ")}</span>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}

