"use client";

import { RefObject } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { TokenMetricCard, type TokenMetric } from "@/components/market-overview/token-metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HERO_FILTERS } from "@/components/market-overview/constants";
import { cn } from "@/lib/utils";
import type { CachedResponse, MarketsResponse } from "@/types/market";
import type { useWatchlist } from "@/hooks/watchlist/use-watchlist";

type HeroSectionProps = {
  heroCards: TokenMetric[];
  heroQueryLoading: boolean;
  heroCarouselRef: RefObject<HTMLDivElement | null>;
  onScroll: (direction: "prev" | "next") => void;
  currency: string;
  watchlist: ReturnType<typeof useWatchlist>;
  onAddCard: (card: TokenMetric) => Promise<void> | void;
  onRemoveCard: (assetId: string) => Promise<void> | void;
  navigateAsset: (id: string) => void;
  heroFilterId: (typeof HERO_FILTERS)[number]["id"];
  onHeroFilterSelect: (id: (typeof HERO_FILTERS)[number]["id"]) => void;
  resolveHeroCategoryId: (id: (typeof HERO_FILTERS)[number]["id"]) => string | null;
  prefetch?: CachedResponse<MarketsResponse> | null;
};

export function HeroSection({
  heroCards,
  heroQueryLoading,
  heroCarouselRef,
  onScroll,
  currency,
  watchlist,
  onAddCard,
  onRemoveCard,
  navigateAsset,
  heroFilterId,
  onHeroFilterSelect,
  resolveHeroCategoryId,
}: HeroSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">spotlight assets</p>
          <h2 className="text-lg font-medium text-foreground">Top market movers</h2>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border border-border/50"
            onClick={() => onScroll("prev")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border border-border/50"
            onClick={() => onScroll("next")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {HERO_FILTERS.map((filter) => {
          const resolvedCategory = resolveHeroCategoryId(filter.id);
          const isActive = heroFilterId === filter.id;
          const disabled = filter.id !== "all" && !resolvedCategory;
          return (
            <button
              key={filter.id}
              type="button"
              disabled={disabled}
              onClick={() => onHeroFilterSelect(filter.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-medium transition",
                disabled && "cursor-not-allowed opacity-50",
                isActive
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {"emoji" in filter && filter.emoji ? (
                <span className="text-base">{filter.emoji}</span>
              ) : null}
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div
          ref={heroCarouselRef}
          className="grid snap-x snap-mandatory auto-cols-[minmax(240px,1fr)] grid-flow-col gap-4 overflow-x-auto no-scrollbar pb-2"
        >
          {heroQueryLoading && heroCards.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={`hero-skeleton-${index}`} className="h-[150px] min-w-[240px] snap-start border-border/50 bg-card/70 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-8 w-32" />
                  <Skeleton className="mt-4 h-16 w-full" />
                </Card>
              ))
            : heroCards.map((card, index) => {
                const existing = watchlist.findItem(card.id, "crypto");
                return (
                  <TokenMetricCard
                    key={card.id}
                    card={card}
                    currency={currency}
                    // Prioritize loading for first 3 above-fold cards for better LCP
                    priority={index < 3}
                    onSelect={() => navigateAsset(card.id)}
                    watchlistState={{
                      isWatched: Boolean(existing),
                      isMutating: watchlist.isMutating,
                      onAdd: () => onAddCard(card),
                      onRemove: () => onRemoveCard(card.id),
                    }}
                  />
                );
              })}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[5%] bg-linear-to-r from-background to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[5%] bg-linear-to-l from-background to-transparent"
        />
      </div>
    </section>
  );
}
