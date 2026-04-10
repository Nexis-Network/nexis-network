"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { ChevronDown, Filter, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { getIconCandidates, PLACEHOLDER_ICON } from "@/lib/token-icons";
import { isVerifiedAsset } from "@/lib/verified-assets";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { useCoinCategories, useMarkets, useTrendingNfts } from "@/hooks/market/use-market-overview";
import type {
  CoinCategorySummary,
  CoinMarketRow,
  NftCollectionSummary,
} from "@/types/market";

type LeaderboardPanelProps = {
  currency: string;
  spotRows: CoinMarketRow[];
  isSpotLoading: boolean;
  isSpotRefreshing: boolean;
};

type PresetFilter =
  | {
    id: "spot";
    label: string;
    type: "spot";
    description: string;
  }
  | {
    id: "nfts";
    label: string;
    type: "nft";
    description: string;
  }
  | {
    id: string;
    label: string;
    type: "category";
    description: string;
    keywords: string[];
  };
type CategoryPreset = Extract<PresetFilter, { type: "category" }>;
type NonCategoryPreset = Exclude<PresetFilter, { type: "category" }>;

type ResolvedPreset = NonCategoryPreset | (CategoryPreset & { categoryId: string | null });

type LeaderboardDisplayRow = {
  id: string;
  assetId?: string | null;
  assetType?: "token" | "nft";
  name: string;
  symbol?: string | null;
  subtitle?: string | null;
  iconCandidates: string[];
  source: "spot" | "category" | "nft";
  metrics: Record<MetricKind, number | null>;
};

type MetricKind = "price" | "marketCap" | "volume" | "delta" | "flow" | "momentum" | "dominance";

type MetricColumn = {
  id: MetricKind;
  label: string;
  type: "currency" | "percent";
  tinted?: boolean;
  signed?: boolean;
  sortable?: boolean;
  compact?: boolean;
};

const METRIC_COLUMNS: MetricColumn[] = [
  { id: "price", label: "Price", type: "currency", sortable: true },
  { id: "marketCap", label: "Mkt Cap", type: "currency", sortable: true, compact: true },
  { id: "volume", label: "Vol 24h", type: "currency", tinted: true, sortable: true, compact: true },
  { id: "delta", label: "Δ 24h", type: "percent", signed: true, sortable: true },
  { id: "flow", label: "Flow", type: "currency", tinted: true, sortable: true, compact: true },
  { id: "momentum", label: "Momentum", type: "percent", signed: true, sortable: true },
  { id: "dominance", label: "Dominance", type: "percent", signed: false, sortable: true },
];

const PRESET_FILTERS: PresetFilter[] = [
  { id: "spot", label: "Spot pairs", type: "spot", description: "Coinbase" },
  { id: "memes", label: "Memecoins", type: "category", description: "CoinGecko", keywords: ["meme"] },
  { id: "layer1", label: "Layer 1", type: "category", description: "CoinGecko", keywords: ["layer 1", "l1"] },
  { id: "layer2", label: "Layer 2", type: "category", description: "CoinGecko", keywords: ["layer 2", "l2"] },
  { id: "defi", label: "DeFi", type: "category", description: "CoinGecko", keywords: ["defi"] },
  { id: "ai", label: "AI", type: "category", description: "CoinGecko", keywords: ["ai", "artificial"] },
  { id: "nfts", label: "NFTs", type: "nft", description: "CoinGecko" },
];

export function LeaderboardPanel({ currency, spotRows, isSpotLoading, isSpotRefreshing }: LeaderboardPanelProps) {
  const navigateAsset = useAssetNavigator();
  const categoriesQuery = useCoinCategories();
  const categories = useMemo(() => categoriesQuery.data?.data ?? [], [categoriesQuery.data?.data]);
  const trendingNftsQuery = useTrendingNfts();

  const [activeFilterId, setActiveFilterId] = useState<string>("spot");
  const [customCategoryId, setCustomCategoryId] = useState<string | null>(null);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [sortState, setSortState] = useState<{ column: MetricKind | null; direction: "asc" | "desc" }>(
    {
      column: "volume",
      direction: "desc",
    },
  );

  const resolvedFilters = useMemo<ResolvedPreset[]>(() => {
    const matchCategoryId = (keywords: string[]): string | null => {
      const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
      const match = categories.find((category) =>
        lowerKeywords.some((keyword) => category.name.toLowerCase().includes(keyword))
      );
      return match?.id ?? null;
    };

    return PRESET_FILTERS.map((filter) => {
      if (filter.type !== "category") {
        return filter;
      }
      return {
        ...filter,
        categoryId: matchCategoryId(filter.keywords),
      };
    });
  }, [categories]);

  const selectedPreset = resolvedFilters.find((filter) => filter.id === activeFilterId);
  const derivedCategoryId = useMemo(() => {
    if (selectedPreset?.type === "category") {
      return selectedPreset.categoryId ?? null;
    }
    if (activeFilterId === "custom") {
      return customCategoryId;
    }
    return null;
  }, [activeFilterId, customCategoryId, selectedPreset]);

  const categoryMarketsQuery = useMarkets({
    vsCurrency: currency,
    order: "volume_desc",
    perPage: 20,
    page: 1,
    category: derivedCategoryId ?? undefined,
    priceChangePercentage: "24h,7d",
    sparkline: false,
    precision: currency === "usd" ? "2" : "full",
  });

  const categoryItems = useMemo(() => categoryMarketsQuery.data?.data?.items ?? [], [categoryMarketsQuery.data?.data?.items]);
  const nftCollections = useMemo(() => trendingNftsQuery.data?.data ?? [], [trendingNftsQuery.data?.data]);

  const presetLabel = useMemo(() => {
    if (selectedPreset) {
      return selectedPreset.label;
    }
    if (activeFilterId === "custom" && customCategoryId) {
      return categories.find((category) => category.id === customCategoryId)?.name ?? "Custom category";
    }
    if (activeFilterId === "custom") {
      return "Custom category";
    }
    return "Spot pairs";
  }, [activeFilterId, categories, customCategoryId, selectedPreset]);

  const displayRows = useMemo<LeaderboardDisplayRow[]>(() => {
    if (activeFilterId === "spot") {
      return buildSpotRows(spotRows);
    }
    if (activeFilterId === "nfts") {
      return buildNftRows(nftCollections);
    }
    if (activeFilterId === "custom" && !customCategoryId) {
      return [];
    }
    return buildMarketRows(categoryItems);
  }, [activeFilterId, categoryItems, customCategoryId, nftCollections, spotRows]);

  const sortedRows = useMemo(() => {
    const column = sortState.column;
    if (!column) {
      return displayRows;
    }
    const rows = [...displayRows];
    rows.sort((a, b) => {
      const left = a.metrics[column] ?? null;
      const right = b.metrics[column] ?? null;
      return compareMetrics(left, right, sortState.direction);
    });
    return rows;
  }, [displayRows, sortState]);

  const blockchainCategories = useMemo(() => {
    return categories
      .filter((category) => /ecosystem|chain/i.test(category.name))
      .slice(0, 8);
  }, [categories]);

  const currentSourceLabel = useMemo(() => {
    if (activeFilterId === "spot") {
      return "Coinbase";
    }
    if (activeFilterId === "nfts") {
      return "CoinGecko NFTs";
    }
    if (activeFilterId === "custom" && customCategoryId) {
      const match = categories.find((category) => category.id === customCategoryId);
      return match ? `CoinGecko · ${match.name}` : "CoinGecko";
    }
    return "CoinGecko";
  }, [activeFilterId, categories, customCategoryId]);

  const datasetLoading =
    activeFilterId === "spot"
      ? isSpotLoading
      : activeFilterId === "nfts"
        ? trendingNftsQuery.isLoading
        : categoryMarketsQuery.isLoading && !categoryMarketsQuery.data;

  const datasetRefreshing =
    activeFilterId === "spot"
      ? isSpotRefreshing
      : activeFilterId === "nfts"
        ? trendingNftsQuery.isFetching && !trendingNftsQuery.isLoading
        : categoryMarketsQuery.isFetching && !!categoryMarketsQuery.data;

  const isCategoryUnavailable = selectedPreset?.type === "category" && !derivedCategoryId;

  const selectedCategoryLabel = useMemo(() => {
    if (activeFilterId === "custom" && customCategoryId) {
      return categories.find((category) => category.id === customCategoryId)?.name ?? "Custom";
    }
    if (selectedPreset?.type === "category") {
      return selectedPreset.label;
    }
    return null;
  }, [activeFilterId, categories, customCategoryId, selectedPreset]);

  const handleSelectPreset = (filterId: string) => {
    setActiveFilterId(filterId);
    if (filterId !== "custom") {
      setCustomCategoryId(null);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setCustomCategoryId(categoryId);
    setActiveFilterId("custom");
    setCategoryPopoverOpen(false);
  };

  const resetCustomCategory = () => {
    setCustomCategoryId(null);
    setActiveFilterId("spot");
  };

  const handleColumnSort = (columnId: MetricKind) => {
    const column = METRIC_COLUMNS.find((col) => col.id === columnId);
    if (!column?.sortable) {
      return;
    }
    setSortState((prev) => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { column: columnId, direction: "asc" };
      }
      return { column: null, direction: "desc" };
    });
  };

  return (
    <div className="rounded-[12px] border border-border/50 bg-card text-foreground">
      <div className="flex h-full min-h-[544px] flex-col rounded-[11px] bg-transparent">
        <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
              <Sparkles className="size-3 text-teal-600 dark:text-teal-400" />
              Filters
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full border border-border/50 bg-muted/50 px-3 text-[11px] uppercase tracking-[0.16px] text-muted-foreground"
            >
              {currentSourceLabel}
              <ChevronDown className="ml-1 size-3" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {resolvedFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;
              const disabled = filter.type === "category" && !filter.categoryId;
              return (
                <button
                  key={filter.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectPreset(filter.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-1 text-[11px] font-medium tracking-[0.16px]",
                    disabled && "cursor-not-allowed opacity-40",
                    isActive
                      ? "border-border/50 bg-muted/50 text-foreground"
                      : "border-border/20 bg-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/20 hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full border border-border/50 bg-muted/50 px-3 text-[11px] tracking-[0.16px] text-foreground"
                >
                  <Filter className="mr-1 size-3" />
                  {selectedCategoryLabel ?? "Browse categories"}
                  <ChevronDown className="ml-1 size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[320px] p-0">
                <Command>
                  <CommandInput placeholder="Search category" />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup heading="CoinGecko categories">
                      {categories.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={`${category.name} ${category.id}`}
                          onSelect={() => handleSelectCategory(category.id)}
                        >
                          <span className="text-sm text-foreground">{category.name}</span>
                          <Badge variant="outline" className="ml-auto border-border/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {formatCategoryValue(category)}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {blockchainCategories.length ? (
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {blockchainCategories.map((category) => {
                  const isActive = customCategoryId === category.id && activeFilterId === "custom";
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelectCategory(category.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px]",
                        isActive
                          ? "border-teal-600/40 bg-teal-600/10 text-teal-600 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-teal-400"
                          : "border-border/20 text-muted-foreground hover:border-border/50 hover:text-foreground",
                      )}
                    >
                      {category.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {customCategoryId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCustomCategory}
                className="h-8 rounded-full px-3 text-[11px] text-muted-foreground"
              >
                Clear
              </Button>
            ) : null}
          </div>

          <div className="text-[11px] text-muted-foreground">
            {presetLabel} · {sortedRows.length ? `${sortedRows.length} assets` : "No assets"}
            {datasetRefreshing ? <span className="ml-2 text-teal-600 dark:text-teal-400">Updating…</span> : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="grid grid-cols-[214px_repeat(6,minmax(0,1fr))_1fr] border-b border-border/50 px-2 py-2 text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
            <div className="pl-2 text-left border-r border-border/50">Asset</div>
            {METRIC_COLUMNS.map((column, index) => {
              const isActive = sortState.column === column.id;
              const isLast = index === METRIC_COLUMNS.length - 1;
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => handleColumnSort(column.id)}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2 py-1 text-[10px] transition-colors",
                    !isLast && "border-r border-border/50",
                    column.sortable ? "text-muted-foreground hover:text-foreground" : "cursor-default text-muted-foreground/70",
                    isActive && "text-foreground",
                  )}
                >
                  <span>{column.label}</span>
                  {column.sortable ? (
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform",
                        isActive ? (sortState.direction === "asc" ? "rotate-180 opacity-100" : "opacity-100") : "opacity-40",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <ScrollArea className="flex-1">
            <div>
              {datasetLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonRow key={`skeleton-${index}`} />
                ))
              ) : isCategoryUnavailable ? (
                <EmptyState message="This preset requires a CoinGecko category that isn't available yet." />
              ) : sortedRows.length === 0 ? (
                <EmptyState message="No data available for the selected filter." />
              ) : (
                sortedRows.map((row, index) => (
                  <LeaderboardDataRow
                    key={row.id}
                    row={row}
                    currency={currency}
                    tinted={index % 2 === 0}
                    onSelect={row.assetId ? () => navigateAsset({ type: row.assetType ?? "token", slug: row.assetId! }) : undefined}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[214px_repeat(6,minmax(0,1fr))_1fr] border-b border-border/50 px-2 py-3">
      <div className="flex items-center gap-3 border-r border-border/50 px-2 py-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {METRIC_COLUMNS.map((column, index) => {
        const isLast = index === METRIC_COLUMNS.length - 1;
        return (
          <div
            key={column.id}
            className={cn(
              "px-2 py-2",
              !isLast && "border-r border-border/50",
              column.tinted && "bg-muted/5",
            )}
          >
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-2 px-8 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      <p className="text-xs text-muted-foreground/70">Try another category or reset the filters above.</p>
    </div>
  );
}

function LeaderboardDataRow({ row, currency, tinted, onSelect }: { row: LeaderboardDisplayRow; currency: string; tinted: boolean; onSelect?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onSelect}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[214px_repeat(6,minmax(0,1fr))_1fr] border-b border-border/50 px-2 text-left transition",
        onSelect ? "hover:bg-muted/50" : "cursor-default",
      )}
    >
      <div className="flex items-center gap-3 border-r border-border/50 px-2 py-3">
        <TokenAvatar name={row.name} symbol={row.symbol} candidates={row.iconCandidates} />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{row.name}</span>
          </div>
          <p className="text-[11px] uppercase text-muted-foreground">{row.subtitle}</p>
        </div>
      </div>
      {METRIC_COLUMNS.map((column, index) => {
        const isLast = index === METRIC_COLUMNS.length - 1;
        return (
          <div
            key={column.id}
            className={cn(
              "flex flex-col items-center justify-center px-2 py-3 text-sm",
              !isLast && "border-r border-border/50",
              column.tinted && "bg-muted/5",
              !column.tinted && tinted && "bg-muted/5",
            )}
          >
            <MetricValue
              value={row.metrics[column.id]}
              type={column.type}
              currency={currency}
              signed={column.signed !== false}
              compact={column.compact}
            />
          </div>
        );
      })}
    </button>
  );
}

function MetricValue({
  value,
  type,
  currency,
  signed = true,
  compact = false,
}: {
  value: number | null;
  type: "currency" | "percent";
  currency: string;
  signed?: boolean;
  compact?: boolean;
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-[11px] font-mono font-normal text-muted-foreground">--</span>;
  }

  if (type === "currency") {
    return (
      <span className="text-[13px] font-mono font-normal text-foreground">
        {formatCurrency(value, { currency, compact })}
      </span>
    );
  }

  const tone = getTone(value);
  return (
    <span
      className={cn(
        "text-[13px] font-mono font-normal",
        tone === "positive" && "text-teal-600 dark:text-teal-400",
        tone === "negative" && "text-red-600 dark:text-red-400",
        tone === "neutral" && "text-muted-foreground",
      )}
    >
      {formatPercentage(value, { sign: signed })}
    </span>
  );
}

function TokenAvatar({
  name,
  symbol,
  candidates,
}: {
  name: string;
  symbol?: string | null;
  candidates: string[];
}) {
  const fallbackCandidates = candidates.length ? candidates : [PLACEHOLDER_ICON];
  const [index, setIndex] = useState(0);
  const currentSrc = fallbackCandidates[index] ?? PLACEHOLDER_ICON;
  const isVerified = isVerifiedAsset({ symbol, name });
  return (
    <div className="relative inline-flex">
      <Avatar className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-card">
        <Image
          src={currentSrc}
          alt={name}
          width={40}
          height={40}
          className="h-full w-full object-cover object-center"
          sizes="40px"
          onError={() => {
            if (index < fallbackCandidates.length - 1) {
              setIndex((prev) => prev + 1);
            }
          }}
        />
        <AvatarFallback className="h-full w-full rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground">
          {(symbol ?? name).slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      {isVerified ? <VerifiedBadge className="bg-card dark:bg-[#0E0F0F]" /> : null}
    </div>
  );
}

function buildSpotRows(rows: CoinMarketRow[]): LeaderboardDisplayRow[] {
  if (!Array.isArray(rows)) return [];
  const totalVolume = rows.reduce((sum, row) => sum + Math.max(row.volume24hUsd ?? 0, 0), 0);
  return rows.slice(0, 12).map((row) => {
    const price = safeNumber(row.priceUsd);
    const marketCap = safeNumber(row.marketCapUsd);
    const volume = safeNumber(row.volume24hUsd);
    const delta = safeNumber(row.priceChangePercentage24h);
    const flow = volume != null && delta != null ? (volume * delta) / 100 : null;
    const momentum = null;
    const dominance = totalVolume > 0 && volume != null ? (volume / totalVolume) * 100 : null;
    return {
      id: `spot-${row.id}`,
      assetId: row.coingeckoId ?? row.id,
      assetType: "token",
      name: row.name,
      symbol: row.symbol,
      subtitle: `${row.symbol.toUpperCase()}/USD`,
      source: "spot",
      iconCandidates: getIconCandidates({ symbol: row.symbol, name: row.name, kind: "token" }),
      metrics: { price, marketCap, volume, delta, flow, momentum, dominance },
    } satisfies LeaderboardDisplayRow;
  });
}

function buildMarketRows(items: CoinMarketRow[]): LeaderboardDisplayRow[] {
  if (!Array.isArray(items)) return [];
  const totalVolume = items.reduce((sum, item) => sum + Math.max(item.totalVolume ?? 0, 0), 0);
  return items.slice(0, 12).map((item) => {
    const price = safeNumber(item.currentPrice);
    const marketCap = safeNumber(item.marketCap);
    const volume = safeNumber(item.totalVolume);
    const delta = safeNumber(item.priceChangePercentage24h);
    const flow = volume != null && delta != null ? (volume * delta) / 100 : null;
    const momentum = safeNumber(item.priceChangePercentage7d);
    const dominance = totalVolume > 0 && volume != null ? (volume / totalVolume) * 100 : null;
    return {
      id: `market-${item.id}`,
      assetId: item.id,
      assetType: "token",
      name: item.name,
      symbol: item.symbol,
      subtitle: `${item.symbol?.toUpperCase() ?? ""} • Rank ${item.marketCapRank ?? "--"}`,
      source: "category",
      iconCandidates: getIconCandidates({ symbol: item.symbol, name: item.name, kind: "token" }),
      metrics: { price, marketCap, volume, delta, flow, momentum, dominance },
    } satisfies LeaderboardDisplayRow;
  });
}

function buildNftRows(items: NftCollectionSummary[]): LeaderboardDisplayRow[] {
  if (!Array.isArray(items)) return [];
  const totalVolume = items.reduce((sum, item) => sum + Math.max(item.volume24hUsd ?? 0, 0), 0);
  return items.slice(0, 12).map((item) => {
    const price = safeNumber(item.floorPriceUsd ?? item.floorPriceNative ?? null);
    const marketCap = safeNumber(item.marketCapUsd);
    const volume = safeNumber(item.volume24hUsd);
    const flow = safeNumber(item.floorPriceUsd ?? item.floorPriceNative ?? null);
    const dominance = totalVolume > 0 && volume != null ? (volume / totalVolume) * 100 : null;
    return {
      id: `nft-${item.id}`,
      assetId: item.id,
      assetType: "nft",
      name: item.name,
      symbol: item.symbol,
      subtitle: `${item.symbol} • NFT`,
      source: "nft",
      iconCandidates: getIconCandidates({ name: item.name, symbol: item.symbol, kind: "token" }),
      metrics: {
        price,
        marketCap,
        volume,
        delta: null,
        flow,
        momentum: null,
        dominance,
      },
    } satisfies LeaderboardDisplayRow;
  });
}

function safeNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function getTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null || Number.isNaN(value) || value === 0) {
    return "neutral";
  }
  return value > 0 ? "positive" : "negative";
}

function compareMetrics(left: number | null, right: number | null, direction: "asc" | "desc") {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return direction === "desc" ? 1 : -1;
  }
  if (right == null) {
    return direction === "desc" ? -1 : 1;
  }
  return direction === "desc" ? right - left : left - right;
}

function formatCategoryValue(category: CoinCategorySummary): string {
  if (category.marketCap && category.marketCap > 1_000_000) {
    return formatCurrency(category.marketCap, { currency: "usd", compact: true });
  }
  if (category.volume24hUsd) {
    return formatCurrency(category.volume24hUsd, { currency: "usd", compact: true });
  }
  return "--";
}
