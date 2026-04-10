"use client";

import { Sparkles } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingCollection } from "@/hooks/market/use-market-overview";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { SantimentWordCloudEntry } from "@/modules/prices/market-overview/api";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

type TrendingNarrativesCardProps = {
  words?: SantimentWordCloudEntry[];
  wordSource?: string;
  isFallback?: boolean;
};

export function TrendingNarrativesCard({ words, wordSource = "Santiment" }: TrendingNarrativesCardProps) {
  const trendingQuery = useTrendingCollection();
  const trendingCategories = trendingQuery.data?.data?.categories?.slice(0, 3) ?? [];
  const wordCloud = words ?? [];
  const isLoading = trendingQuery.isLoading && trendingCategories.length === 0;

  return (
    <section
      className={`flex w-full flex-col gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
      style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
    >
      <div className="flex w-full items-center justify-between px-4">
        <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground">Narratives</span>
      </div>
      <div className={RIGHT_RAIL_PANEL_CLASS}>
        {isLoading ? (
          <TrendingNarrativesSkeleton />
        ) : trendingCategories.length || wordCloud.length ? (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">CoinGecko Themes</p>
              <ul className="space-y-2">
                {trendingCategories.map((category) => {
                  const marketCapUsd = category.quickStats?.marketCapUsd ?? null;
                  const marketCapChange = category.quickStats?.priceChangePercentage24h ?? null;
                  return (
                    <li key={category.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{category.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          MCap · {marketCapUsd != null ? formatCurrency(marketCapUsd, { currency: "USD", compact: true }) : "--"}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                        {marketCapChange != null ? formatPercentage(marketCapChange) : "--"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="size-3" /> {wordSource} Narratives
              </p>
              {wordCloud.length ? (
                <div className="flex flex-wrap gap-2">
                  {wordCloud.slice(0, 10).map((entry) => (
                    <span
                      key={entry.word}
                      className="rounded-full border border-border/50 bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {entry.word}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Santiment signal unavailable.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">No narrative data right now.</div>
        )}
      </div>
    </section>
  );
}

function TrendingNarrativesSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </div>
  );
}
