"use client";

import { useState } from "react";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useTopGainersLosers } from "@/hooks/market/use-market-overview";
import { useAssetNavigator } from "@/hooks/use-asset-navigator";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";
import { isVerifiedAsset } from "@/lib/verified-assets";
import type { MoralisMarketToken } from "@/types/market";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

const MOVERS_LIMIT = 5;

const EVM_CHAIN_OPTIONS = [
  { label: "ETH", chain: "0x1" },
  { label: "BASE", chain: "0x2105" },
  { label: "ARB", chain: "0xa4b1" },
] as const;

function buildEvmTokenSlug(chain: string, address: string) {
  return `evm-${chain.toLowerCase()}-${address}`;
}

export function TopMoversRail() {
  const [view, setView] = useState<"gainers" | "losers">("gainers");
  const [chain, setChain] = useState<(typeof EVM_CHAIN_OPTIONS)[number]["chain"]>("0x1");
  const query = useTopGainersLosers(MOVERS_LIMIT, { chain, timeFrame: "24h" });
  const navigateAsset = useAssetNavigator();
  const gainers = query.data?.data?.gainers ?? [];
  const losers = query.data?.data?.losers ?? [];
  const movers = view === "gainers" ? gainers : losers;
  const isLoading = query.isLoading && movers.length === 0;

  return (
    <section
      className={`flex w-full flex-col gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
      style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
    >
      <div className="flex w-full flex-col gap-2 px-4">
        <div className="flex flex-col gap-2 text-foreground">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">Top Movers</span>
              <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">24h delta</span>
            </div>
            <div className="flex items-center gap-1">
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
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setView("gainers")}
            className={cn(
              "text-[14px] font-medium leading-[18px] tracking-[0.16px] transition-colors",
              view === "gainers" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Gainers
          </button>
          <button
            type="button"
            onClick={() => setView("losers")}
            className={cn(
              "text-[14px] font-medium leading-[18px] tracking-[0.16px] transition-colors",
              view === "losers" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Losers
          </button>
        </div>
      </div>
      <div className={RIGHT_RAIL_PANEL_CLASS}>
        <div className="flex flex-col divide-y divide-border/50">
          {isLoading ? (
            <TopMoversSkeleton />
          ) : movers.length ? (
            movers.slice(0, MOVERS_LIMIT).map((item) => (
              <MoverRow
                key={`${view}-${item.id}`}
                mover={item}
                view={view}
                onSelect={
                  item.address
                    ? () => navigateAsset({ type: "token", slug: buildEvmTokenSlug(chain, item.address!) })
                    : undefined
                }
              />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No mover data available right now.</p>
          )}
        </div>
        <p
          className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground"
          title={query.data?.error ?? undefined}
        >
          Source · Moralis (Discovery)
        </p>
      </div>
    </section>
  );
}

type MoverRowProps = {
  mover: MoralisMarketToken;
  view: "gainers" | "losers";
  onSelect?: () => void;
};

function MoverRow({ mover, view, onSelect }: MoverRowProps) {
  const delta = mover.priceChange24hPercent ?? null;
  const price = mover.priceUsd != null ? formatCurrency(mover.priceUsd, { currency: "USD" }) : "--";
  const deltaColor = delta == null ? "text-muted-foreground" : delta >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-3 py-3 text-left text-foreground transition hover:bg-muted/50"
      >
        <MoverRowContent mover={mover} view={view} deltaColor={deltaColor} price={price} delta={delta} />
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 px-3 py-3 text-left text-foreground">
      <MoverRowContent mover={mover} view={view} deltaColor={deltaColor} price={price} delta={delta} />
    </div>
  );
}

function MoverRowContent({ mover, view, deltaColor, price, delta }: { mover: MoverRowProps["mover"]; view: "gainers" | "losers"; deltaColor: string; price: string; delta: number | null }) {
  const isVerified = isVerifiedAsset({ symbol: mover.symbol, name: mover.name });

  return (
    <>
      <div className="relative inline-flex">
        <div className="relative flex size-8 items-center justify-center overflow-hidden rounded bg-muted">
          {mover.logoUrl ? (
            <Image src={mover.logoUrl} alt={mover.name ?? mover.symbol ?? "Token"} fill sizes="32px" className="object-cover" unoptimized />
          ) : (
            <span className="text-[11px] font-semibold uppercase">{(mover.symbol ?? "??").slice(0, 2)}</span>
          )}
        </div>
        {isVerified ? <VerifiedBadge /> : null}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="truncate text-[14px] font-medium leading-[18px] tracking-[0.16px]">{mover.name ?? mover.symbol ?? "Token"}</span>
          <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">{price}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-light uppercase tracking-[0.16px] text-muted-foreground">
            <span>{mover.symbol ?? "—"}</span>
            <span className="text-[12px] leading-4">·</span>
            <span>{view === "gainers" ? "Momentum" : "Volatility"}</span>
          </div>
          <span className={cn("text-[14px] font-light leading-5 tracking-[0.16px]", deltaColor)}>
            {delta != null ? formatPercentage(delta, { sign: true }) : "--"}
          </span>
        </div>
      </div>
    </>
  );
}

function TopMoversSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </>
  );
}
