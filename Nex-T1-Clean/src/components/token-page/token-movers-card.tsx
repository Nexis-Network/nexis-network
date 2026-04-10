"use client";

import { useState } from "react";
import Image from "next/image";

import { useTopGainersLosers } from "@/hooks/market/use-market-overview";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { isVerifiedAsset } from "@/lib/verified-assets";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS } from "./constants";

const LIMIT = 5;
const EVM_CHAIN_OPTIONS = [
  { label: "ETH", chain: "0x1" },
  { label: "BASE", chain: "0x2105" },
  { label: "ARB", chain: "0xa4b1" },
] as const;

function buildEvmTokenSlug(chain: string, address: string) {
  return `evm-${chain.toLowerCase()}-${address}`;
}

type ViewMode = "gainers" | "losers" | "active";

export function TokenMoversCard() {
  const [view, setView] = useState<ViewMode>("gainers");
  const [chain, setChain] = useState<(typeof EVM_CHAIN_OPTIONS)[number]["chain"]>("0x1");
  const query = useTopGainersLosers(LIMIT * 2, { chain, timeFrame: "24h" });
  const navigateAsset = useAssetNavigator();
  const gainers = query.data?.data?.gainers ?? [];
  const losers = query.data?.data?.losers ?? [];

  const active = [...gainers, ...losers]
    .filter((item) => item.volume24hUsd != null)
    .sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))
    .slice(0, LIMIT);

  const viewMap: Record<ViewMode, typeof gainers> = {
    gainers,
    losers,
    active,
  };
  const rows = viewMap[view];
  const isLoading = query.isLoading && rows.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">Top movers</p>
            <h3 className="text-sm font-semibold leading-5 text-foreground">24h change</h3>
          </div>
          <div className="flex gap-4 text-xs">
            {(["gainers", "losers", "active"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-none border-b-2 px-1 pb-1 text-[11px] uppercase tracking-[0.16px] transition-colors",
                  view === mode
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {EVM_CHAIN_OPTIONS.map((opt) => (
            <button
              key={opt.chain}
              type="button"
              onClick={() => setChain(opt.chain)}
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16px] transition-colors",
                chain === opt.chain
                  ? "border-border/60 bg-muted text-foreground"
                  : "border-border/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card className={cn(TOKEN_PANEL_FRAME_CLASS, "text-foreground")}>
        <div className={cn(TOKEN_PANEL_INNER_CLASS, "rounded-[11px]")}>
          <div className="divide-y divide-border">
            {isLoading ? (
              <TokenMoversSkeleton />
            ) : rows.length ? (
              rows.slice(0, LIMIT).map((item) => {
                const canNavigate = Boolean(item.address);
                const isVerified = isVerifiedAsset({ symbol: item.symbol, name: item.name });
                const content = (
                  <>
                    <div className="relative inline-flex">
                      <div className="relative flex size-[34px] items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                        {item.logoUrl ? (
                          <Image src={item.logoUrl} alt={item.name ?? item.symbol ?? "Token"} fill sizes="34px" className="object-cover" unoptimized />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase">{(item.symbol ?? "??").slice(0, 2)}</span>
                        )}
                      </div>
                      {isVerified ? <VerifiedBadge className="size-3" /> : null}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">{item.name ?? item.symbol ?? "Token"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {view === "active"
                          ? `Vol ${formatCurrency(item.volume24hUsd ?? null, { currency: "USD", compact: true })}`
                          : (item.symbol ?? "—")}
                      </p>
                    </div>
                    <div className="text-right text-[13px]">
                      <p className="font-medium text-foreground">{formatCurrency(item.priceUsd ?? null, { currency: "USD" })}</p>
                      <p className={item.priceChange24hPercent != null && item.priceChange24hPercent >= 0 ? "text-primary" : "text-destructive"}>
                        {formatPercentage(item.priceChange24hPercent ?? null, { sign: true })}
                      </p>
                    </div>
                  </>
                );

                if (canNavigate) {
                  return (
                    <button
                      key={`${view}-${item.id}`}
                      type="button"
                      onClick={() => navigateAsset({ type: "token", slug: buildEvmTokenSlug(chain, item.address!) })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-muted-foreground transition hover:bg-muted/50"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={`${view}-${item.id}`} className="flex items-center gap-3 px-4 py-3 text-left text-muted-foreground">
                    {content}
                  </div>
                );
              })
            ) : (
              <p className="px-5 py-6 text-xs text-muted-foreground">No mover data available.</p>
            )}
          </div>
          <p className="px-4 pb-3 pt-3 text-[10px] uppercase tracking-[0.16px] text-muted-foreground">Source · Moralis</p>
        </div>
      </Card>
    </div>
  );
}

function TokenMoversSkeleton() {
  return (
    <div className="space-y-3 px-5 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2 bg-muted" />
            <Skeleton className="h-3 w-1/3 bg-muted" />
          </div>
          <Skeleton className="h-3 w-10 bg-muted" />
        </div>
      ))}
    </div>
  );
}
