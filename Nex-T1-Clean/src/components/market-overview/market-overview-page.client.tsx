"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Provider as ChatStoreProvider } from "@ai-sdk-tools/store";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Sparkles } from "lucide-react";
import Image from "next/image";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TrendingNarrativesCard } from "@/components/market-overview/right-rail/trending-narratives-card";
import { StandoutCard } from "@/components/market-overview/standout-card";
import { HeroSection } from "@/components/market-overview/sections/hero-section";
import { TickerTape } from "@/components/market-overview/ticker-tape";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { HERO_FILTERS, DEFAULT_VS_CURRENCY } from "@/components/market-overview/constants";
import { useIntersectionOnce } from "@/components/market-overview/hooks/use-intersection-once";
import { sentimentTone, formatDateLabel, splitNews } from "@/components/market-overview/utils";
import { type TokenMetric } from "@/components/market-overview/token-metric-card";
import { buildMarketOverviewContext } from "@/components/market-overview/context-utils";

// Lazy load below-fold sections for better LCP
const MacroNewsSection = dynamic(
  () => import("@/components/market-overview/sections/macro-news-section").then((mod) => mod.MacroNewsSection),
  { loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> },
);
const SignalsSection = dynamic(
  () => import("@/components/market-overview/sections/signals-section").then((mod) => mod.SignalsSection),
  { loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> },
);
const PopularSpacesSection = dynamic(
  () => import("@/components/market-overview/sections/popular-spaces-section").then((mod) => mod.PopularSpacesSection),
  { loading: () => <Skeleton className="h-[120px] w-full rounded-lg" /> },
);
const MarketTablesSection = dynamic(
  () => import("@/components/market-overview/sections/market-tables-section").then((mod) => mod.MarketTablesSection),
  { loading: () => <Skeleton className="h-[400px] w-full rounded-lg" /> },
);
const MarketChatDrawer = dynamic(
  () => import("@/components/market-overview/market-chat-drawer").then((mod) => mod.MarketChatDrawer),
  { ssr: false },
);
const SwapDialog = dynamic(
  () => import("@/components/market-overview/swap-dialog").then((mod) => mod.SwapDialog),
  { ssr: false },
);

import { cn } from "@/lib/utils";
import { useMarketOverviewControls } from "@/hooks/market";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { useWatchlist } from "@/hooks/watchlist/use-watchlist";
import {
  useMarketIndex,
  useMarketLeaderboard,
  useDefillamaYieldPools,
  useDexNewPairs,
  useExchanges,
  useGlobalMarketOverview,
  useMarketSentiment,
  useLatestCryptoNews,
  useMarkets,
  useCoinCategories,
  useSantimentWordCloud,
  useTopMovers,
  useTrendingPools,
  useNftMarkets,
  useDerivativesExchanges,
  useSpotEtfFlows,
} from "@/hooks/market/use-market-overview";
import { marketOverviewKeys } from "@/modules/prices/market-overview/query-keys";
import { formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type {
  CachedResponse,
  MarketsResponse,
  MarketSentiment,
  Coinbase50Index,
  CoinMarketRow,
  CoinCategorySummary,
  NewsArticle,
  TopMover,
} from "@/types/market";
const LeaderboardPanel = dynamic(
  () => import("@/components/market-overview/leaderboard-panel").then((mod) => mod.LeaderboardPanel),
  { loading: () => <Skeleton className="h-[220px] w-full rounded-lg" /> },
);
const DexRadarCard = dynamic(
  () => import("@/components/market-overview/dex-radar-card").then((mod) => mod.DexRadarCard),
  { loading: () => <Skeleton className="h-[260px] w-full rounded-lg" /> },
);
const CreateWatchlistCard = dynamic(
  () =>
    import("@/components/market-overview/right-rail/create-watchlist-card").then(
      (mod) => mod.CreateWatchlistCard,
    ),
  { loading: () => <Skeleton className="h-[180px] w-full rounded-xl" /> },
);
const TvlMoversRailCard = dynamic(
  () =>
    import("@/components/market-overview/right-rail/tvl-movers-rail-card").then(
      (mod) => mod.TvlMoversRailCard,
    ),
  { loading: () => <Skeleton className="h-[220px] w-full rounded-xl" /> },
);
const TopMoversRail = dynamic(
  () =>
    import("@/components/market-overview/right-rail/top-movers-card").then(
      (mod) => mod.TopMoversRail,
    ),
  { loading: () => <Skeleton className="h-[220px] w-full rounded-xl" /> },
);
const TrendingLatestCard = dynamic(
  () =>
    import("@/components/market-overview/right-rail/trending-latest-card").then(
      (mod) => mod.TrendingLatestCard,
    ),
  { loading: () => <Skeleton className="h-[240px] w-full rounded-xl" /> },
);
const TokenUnlocksCard = dynamic(
  () =>
    import("@/components/market-overview/right-rail/token-unlocks-card").then(
      (mod) => mod.TokenUnlocksCard,
    ),
  { loading: () => <Skeleton className="h-[220px] w-full rounded-xl" /> },
);
const NewPairsCard = dynamic(
  () =>
    import("@/components/market-overview/right-rail/new-pairs-card").then(
      (mod) => mod.NewPairsCard,
    ),
  { loading: () => <Skeleton className="h-[200px] w-full rounded-xl" /> },
);
export type AboveFoldPrefetch = {
  heroMarkets: CachedResponse<MarketsResponse> | null;
  leaderboard: CachedResponse<CoinMarketRow[]> | null;
  index: CachedResponse<Coinbase50Index> | null;
  sentiment: CachedResponse<MarketSentiment> | null;
  news: CachedResponse<NewsArticle[]> | null;
};
type MarketOverviewClientProps = {
  prefetch?: AboveFoldPrefetch;
  currency: string;
  initialCategory?: string | null;
};
export type HeroCard = TokenMetric & {
  badge?: string;
  market: string;
  updatedAt?: string | null;
  image?: string;
};


const LIGHT_CARD_SURFACE = "border border-[#EBEBEB] bg-[#EBEBEB] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]";
const LIGHT_OVERLAY_SURFACE = "border border-[#EBEBEB] bg-white/50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]";
const LIGHT_TEXT = "text-[#171717]";
const LIGHT_MUTED = "text-[#666666]";

export function MarketOverviewClient({ prefetch, currency: initialCurrency, initialCategory = null }: MarketOverviewClientProps) {
  const controls = useMarketOverviewControls();
  const navigateAsset = useAssetNavigator();
  const currency = controls.currency || initialCurrency || DEFAULT_VS_CURRENCY;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const watchlist = useWatchlist(currency);
  const developmentsRef = useRef<HTMLDivElement | null>(null);
  const heroCarouselRef = useRef<HTMLDivElement | null>(null);
  const yieldSection = useIntersectionOnce();
  const tablesSection = useIntersectionOnce({ rootMargin: "200px" });
  const standoutsSection = useIntersectionOnce({ rootMargin: "150px" });
  const categoriesQuery = useCoinCategories();
  const categoryList = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data?.data]);
  const initialCategoryFromUrl = controls.categories[0] ?? initialCategory ?? null;
  const [heroFilterId, setHeroFilterId] = useState<(typeof HERO_FILTERS)[number]["id"]>("all");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapFromToken, setSwapFromToken] = useState("ETH");
  const [swapToToken, setSwapToToken] = useState("USDC");
  useEffect(() => {
    if (!categoryList.length) return;
    if (!initialCategoryFromUrl) {
      setHeroFilterId((prev) => (prev === "all" ? prev : "all"));
      return;
    }
    const match = HERO_FILTERS.find((filter) => resolveHeroCategoryId(filter.id, categoryList) === initialCategoryFromUrl);
    if (match && match.id !== heroFilterId) setHeroFilterId(match.id);
  }, [categoryList, heroFilterId, initialCategoryFromUrl]);
  const showAuthToast = () => {
    toast({
      title: "Sign in to save watchlists",
      description: "Create an account to sync personalized alerts across devices.",
    });
  };
  const handleAddHeroCard = async (card: HeroCard) => {
    if (!watchlist.isAuthenticated) return showAuthToast();
    try {
      await watchlist.addItem({
        assetId: card.id,
        assetType: "crypto",
        symbol: card.pair,
        displayName: card.label,
        source: "coingecko",
        metadata: { market: card.market, segment: card.segment },
      });
      toast({
        title: `${card.label} added`,
        description: "We'll ping you when it swings ±5% in price or volume.",
      });
    } catch (error) {
      toast({ title: `Couldn't add ${card.label}`, description: getErrorMessage(error), variant: "destructive" });
    }
  };
  const handleAddTokenMetric = async (card: TokenMetric) => {
    // Convert TokenMetric to HeroCard by finding the original HeroCard or using defaults
    const heroCard = heroCards.find((hc) => hc.id === card.id) ?? {
      ...card,
      market: "Coinbase",
      badge: undefined,
      updatedAt: null,
    };
    return handleAddHeroCard(heroCard);
  };
  const handleRemoveHeroAsset = async (assetId: string) => {
    if (!watchlist.isAuthenticated) return showAuthToast();
    const existing = watchlist.findItem(assetId, "crypto");
    if (!existing) return;
    try {
      await watchlist.removeItem(existing.id);
      toast({ title: `${existing.displayName ?? existing.symbol ?? assetId} removed`, description: "You can add it back anytime." });
    } catch (error) {
      toast({ title: "Couldn't update watchlist", description: getErrorMessage(error), variant: "destructive" });
    }
  };
  const handleRemoveWatchlistItemById = async (itemId: string) => {
    if (!watchlist.isAuthenticated) return showAuthToast();
    try {
      await watchlist.removeItem(itemId);
      toast({ title: "Removed from watchlist", description: "We'll stop sending alerts for this asset." });
    } catch (error) {
      toast({ title: "Couldn't update watchlist", description: getErrorMessage(error), variant: "destructive" });
    }
  };
  const heroCategoryId = useMemo(() => {
    if (heroFilterId !== "all") {
      const resolved = resolveHeroCategoryId(heroFilterId, categoryList);
      if (resolved) return resolved;
    }
    return controls.categories[0] ?? initialCategoryFromUrl ?? null;
  }, [categoryList, controls.categories, heroFilterId, initialCategoryFromUrl]);
  const heroQueryParams = useMemo(
    () => ({
      vsCurrency: currency,
      order: "market_cap_desc" as const,
      perPage: 8,
      page: 1,
      category: heroCategoryId ?? undefined,
      priceChangePercentage: "1h,24h,7d" as const,
      sparkline: true,
      precision: currency === "usd" ? "2" : "full",
    }),
    [currency, heroCategoryId],
  );
  const [heroStreamData, setHeroStreamData] = useState<CachedResponse<MarketsResponse> | null>(
    prefetch?.heroMarkets ?? null,
  );
  useEffect(() => setHeroStreamData(null), [currency, heroCategoryId]);
  useEffect(() => {
    const params = new URLSearchParams({
      vs_currency: heroQueryParams.vsCurrency,
      order: heroQueryParams.order,
      per_page: String(heroQueryParams.perPage),
      page: String(heroQueryParams.page),
      price_change_percentage: heroQueryParams.priceChangePercentage,
      sparkline: String(heroQueryParams.sparkline),
      precision: heroQueryParams.precision,
    });
    if (heroQueryParams.category) params.set("category", heroQueryParams.category);
    const source = new EventSource(`/api/analytics/market-overview/hero-stream?${params.toString()}`);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as CachedResponse<MarketsResponse>;
        setHeroStreamData(parsed);
        queryClient.setQueryData(marketOverviewKeys.markets(heroQueryParams), parsed);
      } catch {
        /* ignore malformed */
      }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [heroQueryParams, queryClient]);
  const heroQuery = useMarkets({ ...heroQueryParams, initialData: currency === DEFAULT_VS_CURRENCY ? prefetch?.heroMarkets ?? undefined : undefined });
  const leaderboardQuery = useMarketLeaderboard({ initialData: prefetch?.leaderboard ?? undefined });
  const indexQuery = useMarketIndex({ initialData: prefetch?.index ?? undefined });
  const sentimentQuery = useMarketSentiment({ initialData: prefetch?.sentiment ?? undefined });
  const globalQuery = useGlobalMarketOverview();
  const topMoversQuery = useTopMovers({ vsCurrency: currency, duration: "24h", topCoinCount: 500, enabled: standoutsSection.hasEntered });
  const newsQuery = useLatestCryptoNews({ enabled: true, initialData: prefetch?.news ?? undefined });
  const yieldPoolsQuery = useDefillamaYieldPools({ limit: 60, minTvlUsd: 500_000, enabled: yieldSection.hasEntered });
  // Defer table data fetching until section is near viewport
  const trendingPoolsQuery = useTrendingPools({ enabled: tablesSection.hasEntered });

  // Fresh listings: prefer DexTools new pairs (with built-in fallbacks) and defer until visible.
  const freshPairsQuery = useDexNewPairs({ limit: 50, enabled: tablesSection.hasEntered });
  const spotEtfFlowsQuery = useSpotEtfFlows({ enabled: tablesSection.hasEntered });
  const exchangesQuery = useExchanges({ enabled: tablesSection.hasEntered });
  const derivativesExchangesQuery = useDerivativesExchanges({ enabled: tablesSection.hasEntered });
  const nftMarketsQuery = useNftMarkets({ perPage: 50, page: 1, enabled: tablesSection.hasEntered });
  const santimentWindow = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const santimentWordCloudQuery = useSantimentWordCloud(
    { slug: "bitcoin", from: santimentWindow.from, to: santimentWindow.to, socialSource: "telegram" },
    Boolean(santimentWindow.from && santimentWindow.to),
  );
  const wordCloudTags = santimentWordCloudQuery.data?.data?.wordsCloud ?? [];
  const isWordCloudFallback = Boolean(santimentWordCloudQuery.data?.fallback);
  const wordCloudSourceLabel = santimentWordCloudQuery.data?.source === "COINGECKO_TRENDS" ? "CoinGecko" : "Santiment";
  const scrollHeroCarousel = (direction: "prev" | "next") => {
    const node = heroCarouselRef.current;
    if (!node) return;
    const scrollAmount = node.offsetWidth > 0 ? node.offsetWidth * 0.8 : 320;
    node.scrollBy({ left: direction === "next" ? scrollAmount : -scrollAmount, behavior: "smooth" });
  };
  const heroCards: HeroCard[] = useMemo(() => {
    const marketData = heroStreamData ?? heroQuery.data;
    const fetchedAt = marketData?.fetchedAt ?? null;
    const coins = marketData?.data?.items?.map((coin) => {
      const delta = coin.priceChangePercentage24h ?? null;
      const price = coin.currentPrice ?? null;
      const deltaValue = price != null && delta != null ? price * (delta / 100) : null;
      return {
        id: coin.id,
        label: coin.name,
        pair: `${coin.symbol?.toUpperCase() ?? ""}USD`,
        price,
        delta,
        deltaValue,
        volume: coin.totalVolume ?? null,
        sparkline: coin.sparkline7d ?? [],
        market: "Coinbase",
        segment: "CRYPTO",
        updatedAt: coin.lastUpdated ?? fetchedAt,
        badge: undefined,
        tone: delta == null ? "neutral" : delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral",
        image: coin.image,
      } as HeroCard;
    }) ?? [];
    const indexData = indexQuery.data?.data;
    const indexCard: HeroCard | null = indexData
      ? {
        id: "coin-50",
        label: "Coin 50",
        pair: "COIN50USD",
        price: indexData.level,
        delta: indexData.changePercent24h,
        deltaValue: indexData.changeValue24h ?? null,
        volume: indexData.volume24hUsd,
        badge: "Index",
        sparkline: indexData.chart.map((point) => point.value),
        market: "Coinbase",
        segment: "INDEX",
        updatedAt: indexData.updatedAt,
        tone: (indexData.changePercent24h ?? 0) > 0 ? "positive" : (indexData.changePercent24h ?? 0) < 0 ? "negative" : "neutral",
      }
      : null;
    return indexCard ? [...coins, indexCard] : coins;
  }, [heroStreamData, heroQuery.data, indexQuery.data?.data]);
  const sentiment = sentimentQuery.data?.data;
  const leaderboardRows = useMemo(() => leaderboardQuery.data?.data ?? [], [leaderboardQuery.data?.data]);
  const newsItems = useMemo(() => newsQuery.data?.data ?? [], [newsQuery.data?.data]);
  const { summary: summaryNews, developments } = splitNews(newsItems);
  const standoutAssets = buildStandouts([...(topMoversQuery.data?.data?.gainers ?? []), ...(topMoversQuery.data?.data?.losers ?? [])]);
  const yieldPools = yieldPoolsQuery.data?.data ?? [];
  const trendingPools = trendingPoolsQuery.data?.data ?? [];
  const freshPairs = freshPairsQuery.data?.data ?? [];
  const spotEtfFlows = spotEtfFlowsQuery.data?.data?.rows ?? [];
  const exchanges = exchangesQuery.data?.data ?? [];
  const nftMarkets = nftMarketsQuery.data?.data ?? [];
  const lastUpdatedLabel = formatRelativeTime(globalQuery.data?.fetchedAt ?? indexQuery.data?.fetchedAt ?? new Date().toISOString());
  const yieldUpdatedLabel = formatRelativeTime(yieldPoolsQuery.data?.fetchedAt ?? new Date().toISOString());
  const trendingUpdatedLabel = formatRelativeTime(trendingPoolsQuery.data?.fetchedAt ?? new Date().toISOString());
  const freshPairsUpdatedLabel = formatRelativeTime(freshPairsQuery.data?.fetchedAt ?? new Date().toISOString());
  const spotEtfUpdatedLabel = formatRelativeTime(spotEtfFlowsQuery.data?.fetchedAt ?? new Date().toISOString());
  const exchangesUpdatedLabel = formatRelativeTime(exchangesQuery.data?.fetchedAt ?? new Date().toISOString());
  const derivativesUpdatedLabel = formatRelativeTime(derivativesExchangesQuery.data?.fetchedAt ?? new Date().toISOString());
  const nftUpdatedLabel = formatRelativeTime(nftMarketsQuery.data?.fetchedAt ?? new Date().toISOString());
  const sentimentScore = sentiment?.score ?? null;
  const sentimentToneClass =
    sentimentTone(sentimentScore) === "positive"
      ? "text-[#31B8C6]"
      : sentimentTone(sentimentScore) === "negative"
        ? "text-[#FF5459]"
        : "text-muted-foreground";

  const marketContext = useMemo(() => {
    if (!isChatOpen) return undefined;
    return buildMarketOverviewContext({
      heroCards,
      sentiment: sentiment ?? null,
      leaderboard: leaderboardRows,
      news: newsItems,
      standouts: standoutAssets,
    });
  }, [isChatOpen, heroCards, sentiment, leaderboardRows, newsItems, standoutAssets]);

  const handleChatAction = (action: string, params: string[]) => {
    try {
      logger.debug(`[MarketOverview] Handling chat action: ${action}`, params); // Telemetry
      switch (action) {
        case "FILTER_HERO":
          if (params[0]) {
            const filterId = params[0].toLowerCase().trim();
            const validFilter = HERO_FILTERS.find(f => f.id === filterId);
            if (validFilter) {
              handleHeroFilterSelect(validFilter.id, controls, categoryList, setHeroFilterId);
              toast({ title: `Filtered by ${validFilter.label}` });
            } else {
              logger.warn(`[MarketOverview] Invalid filter ID: ${filterId}`);
            }
          }
          break;
        case "NAVIGATE":
          if (params[0]) {
            const symbol = params[0].toUpperCase().trim();
            // Try to find asset ID from hero cards or leaderboard
            const asset = heroCards.find(c => c.pair.startsWith(symbol)) ||
              leaderboardRows.find(r => r.symbol === symbol);

            if (asset) {
              navigateAsset({ type: "token", slug: asset.id.toString() });
            } else {
              // Fallback to symbol search or generic navigation
              navigateAsset({ type: "token", slug: symbol.toLowerCase() });
            }
          }
          break;
        case "SWAP":
          if (params[0] && params[1]) {
            setSwapFromToken(params[0].toUpperCase());
            setSwapToToken(params[1].toUpperCase());
            setIsSwapOpen(true);
          }
          break;
        default:
          logger.warn(`[MarketOverview] Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error("[MarketOverview] Error handling chat action:", error);
      toast({ title: "Action Failed", description: "Something went wrong while executing the AI action.", variant: "destructive" });
    }
  };

  return (
    <DashboardShell
      rightPanel={
        <ChatStoreProvider>
          <MarketChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            marketContext={marketContext}
            onAction={handleChatAction}
          />
        </ChatStoreProvider>
      }
    >
      <div className="flex h-full flex-col overflow-hidden border border-border/10 bg-background">
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 overflow-y-auto px-4 pb-10 pt-6 sm:px-6">
          <header className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={cn("text-xs uppercase tracking-[0.16px]", LIGHT_MUTED, "dark:text-muted-foreground")}>market intelligence</p>
                <h1 className={cn("text-2xl font-semibold tracking-tight", LIGHT_TEXT, "dark:text-foreground")}>Market overview</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className={cn("flex items-center gap-2 rounded-full px-4 py-1 text-xs", LIGHT_OVERLAY_SURFACE, LIGHT_MUTED, "dark:border-border/40 dark:bg-transparent dark:text-muted-foreground")}>
                  <Sparkles className="size-3.5 text-[#31B8C6]" />
                  Updated {lastUpdatedLabel}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={cn(
                    "gap-2 text-xs h-7",
                    isChatOpen && "bg-accent text-accent-foreground"
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Ask AI
                </Button>
              </div>
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 border-b px-4 py-2",
                LIGHT_OVERLAY_SURFACE.replace("border", "border-b").replace("shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]", ""),
                "dark:border-border/40 dark:bg-card/40 rounded-none border-t-0 border-x-0",
              )}
            >
              <div className={cn("flex flex-wrap items-center gap-3 text-xs", LIGHT_MUTED, "dark:text-muted-foreground")}>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3 text-[#171717] dark:text-muted-foreground" />
                  {formatDateLabel(sentiment?.updatedAt ?? indexQuery.data?.data?.updatedAt ?? null)}
                </span>
              </div>
              <div className={cn("flex flex-wrap items-center gap-3 text-xs", LIGHT_MUTED, "dark:text-muted-foreground")}>
                <div className="flex items-center gap-1">
                  <span className={cn("flex items-center gap-1 text-xs", LIGHT_MUTED, "dark:text-muted-foreground")}>
                    <span className={cn("font-medium uppercase", sentimentToneClass)}>
                      {sentiment?.classification ?? "Neutral"} Sentiment
                    </span>
                    ·
                    <span>{sentimentScore != null ? `${sentimentScore}/100` : "--"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 12 }).map((_, index) => {
                    const active = sentimentScore != null ? index < Math.round(sentimentScore / 8) : index < 6;
                    return (
                      <span
                        key={index}
                        className={cn(
                          "h-2 w-1 rounded-sm",
                          active ? "bg-[#FF5459]" : "bg-[#EBEBEB] dark:bg-white/20",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <TickerTape currency={currency} />
          </header>
          <div className="grid justify-center gap-8 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
            <div className="w-full min-w-0 space-y-8">
              <HeroSection
                heroCards={heroCards}
                heroQueryLoading={heroQuery.isLoading}
                heroCarouselRef={heroCarouselRef}
                onScroll={scrollHeroCarousel}
                currency={currency}
                watchlist={watchlist}
                onAddCard={handleAddTokenMetric}
                onRemoveCard={handleRemoveHeroAsset}
                navigateAsset={(id) => navigateAsset({ type: "token", slug: id })}
                heroFilterId={heroFilterId}
                onHeroFilterSelect={(id) => handleHeroFilterSelect(id, controls, categoryList, setHeroFilterId)}
                resolveHeroCategoryId={(id) => resolveHeroCategoryId(id, categoryList)}
              />
              <section className="space-y-3">
                <div>
                  <p className={cn("text-xs uppercase tracking-[0.16px]", LIGHT_MUTED, "dark:text-muted-foreground")}>leaderboard</p>
                  <h2 className={cn("text-lg font-medium", LIGHT_TEXT, "dark:text-foreground")}>Market depth leaderboard</h2>
                </div>
                <LeaderboardPanel
                  currency={currency}
                  spotRows={leaderboardRows}
                  isSpotLoading={leaderboardQuery.isLoading}
                  isSpotRefreshing={leaderboardQuery.isFetching && !leaderboardQuery.isLoading}
                />
              </section>
              <MarketIntelligenceSection
                assets={
                  watchlist.items.length > 0
                    ? watchlist.items.slice(0, 5).map((item) => (item.symbol ?? "").toLowerCase()).filter(Boolean)
                    : ["eth", "sol", "btc", "arb", "matic"]
                }
              />
              <DexRadarCard />
              <MacroNewsSection
                summaryNews={summaryNews}
                isLoading={newsQuery.isLoading}
                updatedLabel={formatRelativeTime(newsQuery.data?.fetchedAt ?? indexQuery.data?.fetchedAt ?? new Date().toISOString())}
              />
              <SignalsSection
                developments={developments}
                summaryFallback={summaryNews}
                updatedLabel={formatRelativeTime(newsQuery.data?.fetchedAt ?? indexQuery.data?.fetchedAt ?? new Date().toISOString())}
                scrollRef={developmentsRef}
              />
              <PopularSpacesSection
                onSpaceSelect={(id) => {
                  setIsChatOpen(true);
                  toast({
                    title: "AI Assistant Activated",
                    description: id === "explorer" ? "Ask me to analyze any coin." :
                      id === "profiles" ? "Tell me which project to profile." :
                        "I can generate due diligence questions for you.",
                  });
                }}
              />
              <div ref={tablesSection.ref}>
                <MarketTablesSection
                  yieldPools={yieldPools}
                  trendingPools={trendingPools}
                  freshPairs={freshPairs}
                  spotEtfFlows={spotEtfFlows}
                  exchanges={exchanges}
                  nftMarkets={nftMarkets}
                  yieldUpdatedLabel={yieldUpdatedLabel}
                  trendingUpdatedLabel={trendingUpdatedLabel}
                  freshPairsUpdatedLabel={freshPairsUpdatedLabel}
                  spotEtfUpdatedLabel={spotEtfUpdatedLabel}
                  exchangesUpdatedLabel={exchangesUpdatedLabel}
                  nftUpdatedLabel={nftUpdatedLabel}
                  isYieldLoading={yieldPoolsQuery.isLoading || !tablesSection.hasEntered}
                  isYieldError={yieldPoolsQuery.isError}
                  isTrendingLoading={trendingPoolsQuery.isLoading || !tablesSection.hasEntered}
                  isTrendingError={trendingPoolsQuery.isError}
                  isFreshPairsLoading={freshPairsQuery.isLoading || !tablesSection.hasEntered}
                  isFreshPairsError={freshPairsQuery.isError}
                  isSpotEtfLoading={spotEtfFlowsQuery.isLoading || !tablesSection.hasEntered}
                  isSpotEtfError={spotEtfFlowsQuery.isError || Boolean(spotEtfFlowsQuery.data?.fallback)}
                  isExchangesLoading={exchangesQuery.isLoading || !tablesSection.hasEntered}
                  isExchangesError={exchangesQuery.isError}
                  derivatives={derivativesExchangesQuery.data?.data ?? []}
                  derivativesUpdatedLabel={derivativesUpdatedLabel}
                  isDerivativesLoading={derivativesExchangesQuery.isLoading || !tablesSection.hasEntered}
                  isDerivativesError={derivativesExchangesQuery.isError}
                  isNftLoading={nftMarketsQuery.isLoading || !tablesSection.hasEntered}
                  isNftError={nftMarketsQuery.isError}
                />
              </div>
              <section ref={standoutsSection.ref} className="space-y-4">
                <div>
                  <p className={cn("text-xs uppercase tracking-[0.16px]", LIGHT_MUTED, "dark:text-muted-foreground")}>standouts</p>
                  <h2 className={cn("text-lg font-medium", LIGHT_TEXT, "dark:text-foreground")}>Coins on the move</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {standoutAssets.length === 0 && topMoversQuery.isLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                      <Card
                        key={index}
                        className={cn("p-4", LIGHT_CARD_SURFACE, "dark:border-border/40 dark:bg-card/70")}
                      >
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="mt-2 h-6 w-2/3" />
                        <Skeleton className="mt-4 h-20 w-full" />
                      </Card>
                    ))
                    : standoutAssets.slice(0, 4).map((asset) => (
                      <StandoutCard
                        key={asset.id}
                        asset={asset}
                        onSelect={() => navigateAsset({ type: "token", slug: asset.id })}
                      />
                    ))}
                </div>
              </section>
              <footer
                className={cn(
                  "rounded-3xl px-6 py-4 text-xs",
                  LIGHT_OVERLAY_SURFACE,
                  LIGHT_MUTED,
                  "dark:border-border/30 dark:bg-card/50 dark:text-muted-foreground",
                )}
              >
                Financial information provided by Moralis, CoinGecko, CoinMarketCap, DefiLlama, and SoSoValue. Market metrics are for informational purposes only and not intended as investment advice.
              </footer>
            </div>
            <aside className="flex w-full flex-col gap-6 self-start lg:w-[322.91px]">
              <CreateWatchlistCard
                currency={currency}
                items={watchlist.items}
                isAuthenticated={watchlist.isAuthenticated}
                isLoading={watchlist.isLoading}
                isMutating={watchlist.isMutating}
                onRemove={handleRemoveWatchlistItemById}
              />
              <TvlMoversRailCard />
              <TopMoversRail />
              <TrendingLatestCard />
              <TokenUnlocksCard />
              <NewPairsCard />
              <TrendingNarrativesCard
                words={wordCloudTags}
                wordSource={wordCloudSourceLabel}
                isFallback={isWordCloudFallback}
              />
            </aside>
          </div>
        </div>
      </div>
      <SwapDialog
        isOpen={isSwapOpen}
        onClose={() => setIsSwapOpen(false)}
        initialFromToken={swapFromToken}
        initialToToken={swapToToken}
      />
    </DashboardShell >
  );
}
function resolveHeroCategoryId(
  filterId: (typeof HERO_FILTERS)[number]["id"],
  categories: CoinCategorySummary[],
): string | null {
  if (filterId === "all") return null;
  const filter = HERO_FILTERS.find((item) => item.id === filterId);
  if (!filter) return null;
  const keywords = filter.keywords.map((kw) => kw.toLowerCase());
  const match = categories.find((category) => keywords.some((kw) => category.name.toLowerCase().includes(kw)));
  return match?.id ?? null;
}
function handleHeroFilterSelect(
  filterId: (typeof HERO_FILTERS)[number]["id"],
  controls: ReturnType<typeof useMarketOverviewControls>,
  categoryList: CoinCategorySummary[],
  setHeroFilterId: (id: (typeof HERO_FILTERS)[number]["id"]) => void,
) {
  setHeroFilterId(filterId);
  const resolvedCategory = resolveHeroCategoryId(filterId, categoryList);
  if (!resolvedCategory || filterId === "all") {
    controls.clearCategories();
    return;
  }
  controls.setCategories([resolvedCategory]);
}
function buildStandouts(topMovers: TopMover[] = []): TopMover[] {
  const gainers = topMovers.filter((m) => (m.priceChangePercentage24h ?? 0) > 0).slice(0, 2);
  const losers = topMovers.filter((m) => (m.priceChangePercentage24h ?? 0) < 0).slice(0, 2);
  return [...gainers, ...losers];
}
function getErrorMessage(error: UntypedJson) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected error";
  }
}

import { useMarketDataOverview } from "@/lib/hooks/market/use-market-intelligence";


import { logger } from '@/lib/logger';
function MarketIntelligenceSection({ assets }: { assets: string[] }) {
  const { data, isLoading } = useMarketDataOverview(assets);
  const metrics = data?.data ?? [];

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div>
          <p className={cn("text-xs uppercase tracking-[0.16px]", LIGHT_MUTED, "dark:text-muted-foreground")}>deep dive</p>
          <h2 className={cn("text-lg font-medium", LIGHT_TEXT, "dark:text-foreground")}>Market Intelligence</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!metrics.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <p className={cn("text-xs uppercase tracking-[0.16px]", LIGHT_MUTED, "dark:text-muted-foreground")}>deep dive</p>
        <h2 className={cn("text-lg font-medium", LIGHT_TEXT, "dark:text-foreground")}>Market Intelligence</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.slice(0, 3).map((asset) => (
          <Card key={asset.asset} className={cn("p-4 space-y-3", LIGHT_CARD_SURFACE, "dark:border-border/40 dark:bg-card/70")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {asset.image ? (
                  <div className="relative h-6 w-6 overflow-hidden rounded-full">
                    <Image src={asset.image} alt={asset.asset} fill className="object-cover" sizes="24px" />
                  </div>
                ) : null}
                <span className="text-sm font-medium uppercase">{asset.asset}</span>
              </div>
              <span className="text-xs text-muted-foreground">24h Revenue</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                {formatCurrency(asset.metrics?.protocolRevenueUsd ?? null, { currency: "usd", compact: true })}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>TVL: {formatCurrency(asset.metrics?.tvlUsd ?? null, { currency: "usd", compact: true })}</span>
                <span>•</span>
                <span>Vol: {formatCurrency(asset.metrics?.volume24h ?? null, { currency: "usd", compact: true })}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function formatCurrency(value: number | null, options: { currency: string; compact?: boolean }) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}
