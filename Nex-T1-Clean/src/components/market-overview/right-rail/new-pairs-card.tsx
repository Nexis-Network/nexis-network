"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDexNewPairs, usePumpfunNewTokens } from "@/hooks/market/use-market-overview";
import { formatCurrency, formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

const DEFAULT_CURRENCY = "usd";

export function NewPairsCard() {
    const [view, setView] = useState<"evm" | "pumpfun">("evm");
    const evmQuery = useDexNewPairs({ limit: 6, enabled: view === "evm" });
    const pumpQuery = usePumpfunNewTokens({ limit: 6, network: "mainnet", enabled: view === "pumpfun" });

    const evmPairs = evmQuery.data?.data ?? [];
    const pumpTokens = pumpQuery.data?.data?.items ?? [];

    const isLoading =
      view === "evm"
        ? evmQuery.isLoading && evmPairs.length === 0
        : pumpQuery.isLoading && pumpTokens.length === 0;

    const isFallback = Boolean((view === "evm" ? evmQuery.data?.fallback : pumpQuery.data?.fallback));
    const sourceLabel =
      view === "evm"
        ? (isFallback ? "Dextools (fallback)" : "Dextools")
        : (isFallback ? "Moralis Pump.fun (fallback)" : "Moralis Pump.fun");

    return (
        <section
            className={`flex w-full flex-col items-start gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
            style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
        >
            <div className="flex w-full items-center justify-between px-4">
                <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground">
                    New Pairs
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex h-7 items-center gap-1 rounded-full border border-border/50 px-3 text-[11px] text-foreground"
                >
                    View all
                    <ArrowRight className="size-3.5" />
                </Button>
            </div>
            <div className="flex w-full items-center gap-2 px-4">
              {(["evm", "pumpfun"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setView(tab)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16px] transition-colors",
                    view === tab
                      ? "border-border/60 bg-muted text-foreground"
                      : "border-border/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "evm" ? "EVM" : "Pump.fun"}
                </button>
              ))}
            </div>
            <div className={RIGHT_RAIL_PANEL_CLASS}>
                {isLoading ? (
                    <NewPairsSkeleton />
                ) : view === "evm" && evmPairs.length ? (
                    <ul className="flex flex-col divide-y divide-border/50">
                        {evmPairs.slice(0, 5).map((pair) => {
                            const fallbackText = (pair.baseToken.symbol ?? pair.baseToken.name ?? "--")
                                .slice(0, 2)
                                .toUpperCase();

                            return (
                                <li key={pair.id} className="flex items-center gap-3 px-3 py-3 text-foreground">
                                    <div className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/50 text-xs font-semibold uppercase tracking-[0.16px] text-foreground">
                                        {fallbackText}
                                    </div>
                                    <div className="flex flex-1 flex-col">
                                        <div className="flex items-center justify-between text-[14px] font-medium tracking-[0.16px]">
                                            <span className="truncate">{pair.baseToken.symbol}/{pair.quoteToken.symbol}</span>
                                            <span className="flex h-5 items-center text-[14px] font-light tracking-[0.16px] text-muted-foreground">
                                                {pair.priceUsd != null ? formatCurrency(pair.priceUsd, { currency: DEFAULT_CURRENCY }) : "--"}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-[11px] font-light tracking-[0.16px] text-muted-foreground">
                                            <span className="uppercase">{pair.dexName ?? "DEX"}</span>
                                            <span>{pair.volumeUsd24h != null ? `Vol ${formatCurrency(pair.volumeUsd24h, { currency: DEFAULT_CURRENCY, compact: true })}` : "Vol --"}</span>
                                            <span className="text-right">{formatRelativeTime(pair.pairCreatedAt ?? null)}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : view === "pumpfun" && pumpTokens.length ? (
                    <ul className="flex flex-col divide-y divide-border/50">
                      {pumpTokens.slice(0, 5).map((token) => {
                        const fallbackText = (token.symbol ?? token.name ?? "--").slice(0, 2).toUpperCase();
                        return (
                          <li key={token.address} className="flex items-center gap-3 px-3 py-3 text-foreground">
                            <div className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted/50 text-xs font-semibold uppercase tracking-[0.16px] text-foreground">
                              {token.imageUrl ? (
                                <Image src={token.imageUrl} alt={token.name ?? token.symbol ?? token.address} fill sizes="32px" className="object-cover" unoptimized />
                              ) : (
                                fallbackText
                              )}
                            </div>
                            <div className="flex flex-1 flex-col">
                              <div className="flex items-center justify-between text-[14px] font-medium tracking-[0.16px]">
                                <span className="truncate">{token.symbol ?? token.name ?? token.address.slice(0, 6)}</span>
                                <span className="flex h-5 items-center text-[14px] font-light tracking-[0.16px] text-muted-foreground">
                                  {token.priceUsd != null ? formatCurrency(token.priceUsd, { currency: DEFAULT_CURRENCY }) : "--"}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[11px] font-light tracking-[0.16px] text-muted-foreground">
                                <span className="uppercase">Pump.fun</span>
                                <span>{token.marketCapUsd != null ? `MCap ${formatCurrency(token.marketCapUsd, { currency: DEFAULT_CURRENCY, compact: true })}` : "MCap --"}</span>
                                <span className="text-right">{formatRelativeTime(token.createdAt ?? null)}</span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                ) : (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      {view === "evm" ? "No new pairs available." : "No Pump.fun tokens available."}
                    </div>
                )}
                <p
                    className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground"
                    title={view === "evm" ? evmQuery.data?.error ?? undefined : pumpQuery.data?.error ?? undefined}
                >
                    Source · {sourceLabel}
                </p>
            </div>
        </section>
    );
}

function NewPairsSkeleton() {
    return (
        <div className="space-y-3 px-3 py-3">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                </div>
            ))}
        </div>
    );
}
