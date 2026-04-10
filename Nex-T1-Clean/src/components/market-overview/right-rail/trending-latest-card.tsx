"use client";

import { useState } from "react";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTrendingLatest } from "@/hooks/market/use-market-overview";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { formatCurrency, formatPercentage, formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";
import { isVerifiedAsset } from "@/lib/verified-assets";
import type { MoralisMarketToken } from "@/types/market";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

const TRENDING_LIMIT = 6;

const CHAIN_OPTIONS = [
  { label: "ETH", chain: "0x1" },
  { label: "BASE", chain: "0x2105" },
  { label: "ARB", chain: "0xa4b1" },
  { label: "SOL", chain: "solana" },
] as const;

function buildTokenSlug(token: MoralisMarketToken): string | null {
  if (!token.address) return null;
  if (token.chain === "solana") return `solana-${token.address}`;
  return `evm-${String(token.chain).toLowerCase()}-${token.address}`;
}

export function TrendingLatestCard() {
  const [chain, setChain] = useState<(typeof CHAIN_OPTIONS)[number]["chain"]>("0x1");
  const query = useTrendingLatest(TRENDING_LIMIT, { chain });
  const assets = query.data?.data ?? [];
  const isLoading = query.isLoading && assets.length === 0;
  const navigateAsset = useAssetNavigator();

  const sourceLabel = "Moralis trending";

  return (
    <section
      className={`flex w-full flex-col gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
      style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
    >
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex flex-col gap-2 text-foreground">
          <div className="flex flex-col">
            <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">Trending Latest</span>
            <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">{sourceLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            {CHAIN_OPTIONS.map((opt) => (
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
        <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
          {query.data?.fetchedAt ? formatRelativeTime(query.data.fetchedAt) : "Live"}
        </span>
      </div>
      <div className={RIGHT_RAIL_PANEL_CLASS}>
        {isLoading ? (
          <TrendingLatestSkeleton />
        ) : assets.length ? (
          <div className="flex flex-col divide-y divide-border/50">
            {assets.slice(0, TRENDING_LIMIT).map((asset) => {
              const slug = buildTokenSlug(asset);
              return (
                <TrendingRow
                  key={asset.id}
                  asset={asset}
                  onSelect={slug ? () => navigateAsset({ type: "token", slug }) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">Trending feed unavailable.</p>
        )}
        <p
          className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground"
          title={query.data?.error ?? undefined}
        >
          Source · Moralis
        </p>
      </div>
    </section>
  );
}

type TrendingRowProps = {
  asset: MoralisMarketToken;
  onSelect?: () => void;
};

function TrendingRow({ asset, onSelect }: TrendingRowProps) {
  const delta = asset.priceChange24hPercent ?? null;
  const price = asset.priceUsd != null ? formatCurrency(asset.priceUsd, { currency: "USD" }) : "--";
  const deltaColor = delta == null ? "text-muted-foreground" : delta >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400";
  const isVerified = isVerifiedAsset({ symbol: asset.symbol, name: asset.name });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-3 text-left text-foreground",
        onSelect ? "transition hover:bg-muted/40" : "cursor-default",
      )}
      disabled={!onSelect}
    >
      <div className="relative inline-flex">
        <div className="relative flex size-8 items-center justify-center overflow-hidden rounded bg-muted">
          {asset.logoUrl ? (
            <Image src={asset.logoUrl} alt={asset.name ?? asset.symbol ?? "Token"} fill sizes="32px" className="object-cover" unoptimized />
          ) : (
            <span className="text-[11px] font-semibold uppercase">{(asset.symbol ?? "??").slice(0, 2)}</span>
          )}
        </div>
        {isVerified ? <VerifiedBadge /> : null}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="truncate text-[14px] font-medium leading-[18px] tracking-[0.16px]">{asset.name ?? asset.symbol ?? "Token"}</span>
          <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">{price}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-light uppercase tracking-[0.16px] text-muted-foreground">
            <span>{asset.symbol ?? "—"}</span>
            <span className="text-[12px] leading-4">·</span>
            <span>Trending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-[14px] font-light leading-5 tracking-[0.16px]", deltaColor)}>
              {delta != null ? formatPercentage(delta, { sign: true }) : "--"}
            </span>
            {asset.score != null ? (
              <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16px] text-muted-foreground">
                Score {asset.score.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function TrendingLatestSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </>
  );
}
