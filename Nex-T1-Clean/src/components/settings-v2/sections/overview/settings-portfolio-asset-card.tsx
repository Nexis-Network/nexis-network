"use client";

import Image from "next/image";

import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SettingsTrackedAsset } from "@/lib/portfolio/settings-summary";

import { SettingsPortfolioMiniChart } from "./settings-portfolio-mini-chart";

const TRACKED_ASSET_ICON_PATHS: Record<string, string> = {
  ETH: LIQUID_GLASS_LOGOS.ethereum,
  SOL: LIQUID_GLASS_LOGOS.solana,
  USDT: LIQUID_GLASS_LOGOS.tether,
  USDC: LIQUID_GLASS_LOGOS.usdc,
};

function formatCurrency(value: number, locale: string) {
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function formatPrice(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Spot price unavailable";
  }

  const maximumFractionDigits = value >= 1_000 ? 0 : value >= 1 ? 2 : 4;
  return `${value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  })} spot`;
}

function formatAssetPercentBadge(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (Math.abs(safeValue) < 0.5) {
    return "0%";
  }

  const roundedValue = Math.round(safeValue);
  const prefix = roundedValue > 0 ? "+" : "";
  return `${prefix}${roundedValue}%`;
}

function resolveDeltaBadgeClass(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value < 0
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : "border-primary/20 bg-primary/10 text-primary";
}

function renderAssetIcon(symbol: string) {
  const iconPath = TRACKED_ASSET_ICON_PATHS[symbol];
  if (iconPath) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background"
      >
        <Image
          src={iconPath}
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0 rounded-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted text-xs font-semibold text-foreground">
      {symbol.slice(0, 3)}
    </span>
  );
}

type SettingsPortfolioAssetCardProps = {
  asset: SettingsTrackedAsset;
  locale: string;
  activeIndex: number | null;
  reducedMotion: boolean;
  onPointEnter: (index: number) => void;
  onPointLeave: () => void;
};

export function SettingsPortfolioAssetCard({
  asset,
  locale,
  activeIndex,
  reducedMotion,
  onPointEnter,
  onPointLeave,
}: SettingsPortfolioAssetCardProps) {
  return (
    <section
      aria-label={`${asset.symbol} holdings`}
      data-testid={`settings-portfolio-asset-${asset.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className="rounded-xl border border-border/70 bg-muted/20 p-4"
      title={asset.name}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {renderAssetIcon(asset.symbol)}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{asset.symbol}</p>
              <Badge
                variant="outline"
                className={cn("rounded-md px-2 py-0 text-[11px]", resolveDeltaBadgeClass(asset.changePct24h))}
              >
                {formatAssetPercentBadge(asset.changePct24h)}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
          </div>
        </div>

        <svg aria-hidden="true" viewBox="0 0 8 8" className="mt-1 size-2.5 shrink-0">
          <circle cx="4" cy="4" r="4" fill={asset.color} />
        </svg>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {formatCurrency(asset.totalUsd, locale)}
        </p>
        <p className="text-xs text-muted-foreground">{formatPrice(asset.priceUsd, locale)}</p>
      </div>

      <div className="mt-5">
        <SettingsPortfolioMiniChart
          label={asset.symbol}
          series={asset.series}
          priceUsd={asset.priceUsd}
          activeIndex={activeIndex}
          reducedMotion={reducedMotion}
          onPointEnter={onPointEnter}
          onPointLeave={onPointLeave}
        />
      </div>
    </section>
  );
}
