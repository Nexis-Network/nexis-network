"use client";

import Image from "next/image";

import { Minus, Plus, SlidersHorizontal } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/market/use-market-overview";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";
import type { WatchlistItemSnapshot } from "@/types/watchlist";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";
import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS } from "@/components/token-page/constants";

type CreateWatchlistCardProps = {
  currency: string;
  items?: WatchlistItemSnapshot[];
  isAuthenticated: boolean;
  isLoading?: boolean;
  isMutating?: boolean;
  onRemove?: (itemId: string) => Promise<void>;
  variant?: "rail" | "token";
  hideHeader?: boolean;
};

export function CreateWatchlistCard({
  currency,
  items = [],
  isAuthenticated,
  isLoading = false,
  isMutating = false,
  onRemove,
  variant = "rail",
  hideHeader = false,
}: CreateWatchlistCardProps) {
  const query = useMarkets({
    vsCurrency: currency,
    order: "market_cap_desc",
    perPage: 6,
    page: 1,
    priceChangePercentage: "24h",
    sparkline: false,
    precision: currency === "usd" ? "2" : "full",
  });

  const rows = query.data?.data?.items ?? [];
  const navigateAsset = useAssetNavigator();

  const fallbackIsLoading = query.isLoading && rows.length === 0;

  const isTokenVariant = variant === "token";
  const rootClassName = isTokenVariant
    ? cn(TOKEN_PANEL_FRAME_CLASS, "text-foreground")
    : cn("flex w-full flex-col gap-2", RIGHT_RAIL_WIDTH_CLASS);
  const headerClassName = isTokenVariant
    ? "flex w-full items-center justify-between px-5 pb-3 pt-4"
    : "flex w-full items-center justify-between px-4 pb-2";
  const listWrapperClass = cn(
    "flex flex-col",
    isTokenVariant ? "divide-y divide-border/50" : "divide-y divide-border/50",
  );
  const listItemClass = isTokenVariant ? "text-foreground" : "px-3 py-1 text-foreground";
  const buttonClass = isTokenVariant
    ? "flex w-full items-center gap-3 rounded-[10px] px-[8px] py-[10px] text-left transition hover:bg-muted/50"
    : "flex w-full items-center gap-3 rounded-lg px-0.5 py-2 text-left transition hover:bg-muted/50";
  const emptyStateClass = isTokenVariant
    ? "px-5 py-6 text-sm text-muted-foreground"
    : "px-4 py-6 text-sm text-muted-foreground";

  const renderWatchlistItems = (entries: WatchlistItemSnapshot[]) => (
    <ul className={listWrapperClass}>
      {entries.map((item) => {
        const delta = item.quote?.priceChangePct ?? item.lastPriceChangePct ?? null;
        const deltaTone = delta == null ? "muted" : delta >= 0 ? "positive" : "negative";
        const price = item.quote?.price ?? item.lastPrice ?? null;
        const volume = item.quote?.volume24h ?? item.lastVolume ?? null;
        const name = item.displayName ?? item.symbol ?? item.assetId;

        return (
          <li key={item.id} className={listItemClass}>
            <button
              type="button"
              onClick={() => navigateAsset({ type: item.assetType === "nft" ? "nft" : "token", slug: item.assetId })}
              className={buttonClass}
            >
              <div className={cn("relative size-8 overflow-hidden border border-border/50 bg-muted", isTokenVariant ? "rounded-[4px]" : "rounded")}>
                <span className="flex size-full items-center justify-center text-[11px] font-semibold uppercase">
                  {(item.symbol ?? item.assetId).slice(0, 2)}
                </span>
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="truncate text-[14px] font-medium leading-[18px] tracking-[0.16px]">{name}</span>
                  <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
                    {price != null ? formatCurrency(price, { currency }) : "--"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10.5px] font-light uppercase tracking-[0.16px] text-muted-foreground">
                    <span>{item.symbol ?? item.assetId}</span>
                    <span className="text-[12px] leading-4">·</span>
                    <span className="truncate">{item.assetType === "nft" ? "NFT" : "CRYPTO"}</span>
                  </div>
                  <span
                    className={cn(
                      "text-[14px] font-light leading-5 tracking-[0.16px]",
                      deltaTone === "muted"
                        ? "text-muted-foreground"
                        : deltaTone === "positive"
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {delta != null ? formatPercentage(delta, { sign: true }) : "--"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Vol 24h · {volume != null ? formatCurrency(volume, { currency, compact: true }) : "--"}
                </div>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full border border-border/50 text-foreground">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Remove from watchlist"
                  className={cn(
                    "flex size-full cursor-pointer items-center justify-center rounded-full transition",
                    isMutating ? "opacity-50" : "hover:bg-muted",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isMutating) {
                      void onRemove?.(item.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!isMutating) {
                        void onRemove?.(item.id);
                      }
                    }
                  }}
                >
                  <Minus className="size-4" />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderTrendingAssets = () => (
    <ul className={listWrapperClass}>
      {rows.slice(0, 5).map((asset) => {
        const delta = asset.priceChangePercentage24h ?? null;
        const deltaTone = delta == null ? "muted" : delta >= 0 ? "positive" : "negative";
        const exchangeLabel = "CRYPTO";

        return (
          <li key={asset.id} className={listItemClass}>
            <button
              type="button"
              onClick={() => navigateAsset({ type: "token", slug: asset.id })}
              className={buttonClass}
            >
              <div className={cn("relative size-8 overflow-hidden border border-border/50 bg-muted", isTokenVariant ? "rounded-[4px]" : "rounded")}>
                {asset.image ? (
                  <Image src={asset.image} alt={asset.name} fill sizes="32px" className="object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[11px] font-semibold uppercase">
                    {asset.symbol?.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="truncate text-[14px] font-medium leading-[18px] tracking-[0.16px]">
                    {asset.name}
                  </span>
                  <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
                    {asset.currentPrice != null ? formatCurrency(asset.currentPrice, { currency }) : "--"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10.5px] font-light uppercase tracking-[0.16px] text-muted-foreground">
                    <span>{asset.symbol}</span>
                    <span className="text-[12px] leading-4">·</span>
                    <span className="truncate">{exchangeLabel}</span>
                  </div>
                  <span
                    className={cn(
                      "text-[14px] font-light leading-5 tracking-[0.16px]",
                      deltaTone === "muted"
                        ? "text-muted-foreground"
                        : deltaTone === "positive"
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {delta != null ? formatPercentage(delta, { sign: true }) : "--"}
                  </span>
                </div>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full border border-border/50 text-foreground">
                <Plus className="size-4" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const listContent = isAuthenticated
    ? isLoading
      ? <WatchlistSkeleton variant={variant} />
      : items.length
        ? renderWatchlistItems(items)
        : <div className={emptyStateClass}>Start tracking assets by tapping the plus icon on any coin card.</div>
    : fallbackIsLoading
      ? <WatchlistSkeleton variant={variant} />
      : rows.length
        ? renderTrendingAssets()
        : <div className={emptyStateClass}>No assets available right now.</div>;

  const headerContent = hideHeader
    ? null
    : (
      <div className={headerClassName}>
        <div className="flex flex-col text-foreground">
          <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">Create Watchlist</span>
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-card text-foreground hover:border-border"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>
    );

  return (
    <section className={rootClassName} style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}>
      {isTokenVariant ? (
        <div className={cn(TOKEN_PANEL_INNER_CLASS, "flex flex-col rounded-[11px] bg-card p-[1px]")}>
          {!hideHeader ? headerContent : null}
          <div className="flex h-full flex-col">{listContent}</div>
        </div>
      ) : (
        <>
          {headerContent}
          <div className={RIGHT_RAIL_PANEL_CLASS}>{listContent}</div>
        </>
      )}
    </section>
  );
}

function WatchlistSkeleton({ variant = "rail" }: { variant?: "rail" | "token" }) {
  const paddingClass = variant === "token" ? "px-[12px] py-[8px]" : "px-3 py-3";
  const avatarClass = variant === "token" ? "size-8 rounded-[4px]" : "size-8 rounded";
  return (
    <div className={cn("space-y-3", paddingClass)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className={avatarClass} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
