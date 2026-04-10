"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDefiTvlMovers } from "@/hooks/market/use-market-overview";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";

import { cn } from "@/lib/utils";
import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

export function TvlMoversRailCard() {
  const [view, setView] = useState<"gainers" | "losers">("gainers");
  const query = useDefiTvlMovers({ limit: 6 });
  const data = query.data?.data ?? { gainers: [], losers: [] };
  const movers = (view === "gainers" ? data.gainers : data.losers) ?? [];
  const isLoading = query.isLoading && !movers.length;

  return (
    <section
      className={`flex w-full flex-col gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
      style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
    >
      <div className="flex w-full flex-col gap-2 px-4">
        <div className="flex flex-col text-foreground">
          <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">TVL Movers</span>
          <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">24h delta</span>
        </div>
        <div className="flex items-center gap-4">
          {[
            { id: "gainers" as const, label: "Gainers" },
            { id: "losers" as const, label: "Losers" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                "text-[14px] font-medium leading-[18px] tracking-[0.16px] transition-colors",
                view === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={RIGHT_RAIL_PANEL_CLASS}>
        <div className="flex max-h-[229px] flex-col overflow-y-auto">
          {isLoading ? (
            <RailSkeleton />
          ) : movers.length ? (
            movers.slice(0, 6).map((protocol) => (
              <div
                key={protocol.id}
                className="flex items-center gap-3 px-3 py-3 text-foreground"
              >
                <div className="flex size-8 items-center justify-center overflow-hidden rounded bg-muted/50">
                  {protocol.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={protocol.logo}
                      alt={protocol.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {protocol.name.slice(0, 4)}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between text-[14px] font-medium tracking-[0.16px] text-foreground">
                    <span className="truncate">{protocol.name}</span>
                    <span className="flex h-5 items-center text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
                      {protocol.tvlUsd != null ? formatCurrency(protocol.tvlUsd, { currency: "USD" }) : "--"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-light text-muted-foreground">
                    <span className="truncate uppercase tracking-[0.16px]">
                      {protocol.chains.slice(0, 2).join(" · ") || protocol.category || "DeFi"}
                    </span>
                    <span className="flex items-center gap-1 text-[13px] font-medium">
                      {protocol.percentChange24h != null ? (
                        <>
                          <span className={view === "gainers" ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}>
                            {formatPercentage(protocol.percentChange24h)}
                          </span>
                        </>
                      ) : (
                        "--"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No TVL data available right now.</div>
          )}
        </div>
        <p className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground">Source · DeFiLlama</p>
      </div>
    </section>
  );
}

function RailSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
