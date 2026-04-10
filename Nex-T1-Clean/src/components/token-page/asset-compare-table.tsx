"use client";

import type { ReactNode } from "react";

import { formatCurrency, formatNumber, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";

export type ComparisonRow = {
  id: string;
  name: string;
  symbol: string;
  assetType: "token" | "nft";
  logoUrl?: string | null;
  priceUsd: number | null;
  priceNative?: number | null;
  nativeSymbol?: string | null;
  deltaUsd: number | null;
  deltaPercent: number | null;
  accent?: "positive" | "negative" | "neutral";
  meta?: ReactNode;
  isPrimary?: boolean;
};

export type AssetCompareTableProps = {
  rows: ComparisonRow[];
  onRemove?: (rowId: string) => void;
};

const ACCENT_COLORS: Record<NonNullable<ComparisonRow["accent"]>, string> = {
  positive: "bg-teal-500",
  negative: "bg-red-500",
  neutral: "bg-muted-foreground/20",
};

const DELTA_STYLES: Record<"positive" | "negative" | "neutral", { badge: string; text: string }> = {
  positive: {
    badge: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
  },
  negative: {
    badge: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
  neutral: {
    badge: "bg-muted",
    text: "text-muted-foreground",
  },
};

export function AssetCompareTable({ rows, onRemove }: AssetCompareTableProps) {
  if (!rows.length) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[861.09px] rounded-xl border border-border/40 bg-muted/20">
      {rows.map((row, index) => {
        const accentKey = row.accent ?? (row.deltaPercent == null ? "neutral" : row.deltaPercent >= 0 ? "positive" : "negative");
        const accentClass = ACCENT_COLORS[accentKey];
        const deltaTone = DELTA_STYLES[accentKey === "neutral" && row.deltaPercent != null ? (row.deltaPercent >= 0 ? "positive" : "negative") : accentKey];
        const priceLabel = row.priceUsd != null
          ? formatCurrency(row.priceUsd, { currency: "USD" })
          : row.priceNative != null
            ? `${row.nativeSymbol ?? ""} ${formatNumber(row.priceNative, { maximumFractionDigits: 4 })}`.trim()
            : "--";
        const deltaLabel = row.deltaUsd != null
          ? formatCurrency(row.deltaUsd, { currency: "USD", signDisplay: "always" })
          : "--";
        const percentLabel = row.deltaPercent != null
          ? formatPercentage(row.deltaPercent / 100, { sign: true })
          : "--";
        const symbol = row.symbol ? row.symbol.toUpperCase() : "--";

        return (
          <div
            key={row.id}
            className={cn(
              "flex items-center gap-4 px-4 py-3",
              index !== rows.length - 1 && "border-b border-border/40",
              index === 0 ? "bg-muted/30" : "bg-transparent",
            )}
          >
            <div className="flex h-full items-center py-1">
              <span className={cn("block h-8 w-1 rounded-full", accentClass)} />
            </div>
            <div className="flex items-center gap-3">
              <AssetAvatar src={row.logoUrl} symbol={symbol} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                <div className="flex items-center gap-1 text-[11px] font-light uppercase tracking-[0.16px] text-muted-foreground">
                  <span>{symbol}</span>
                  <span aria-hidden>•</span>
                  <span>{row.assetType === "nft" ? "NFT" : "Token"}</span>
                  {row.meta ? (
                    <>
                      <span aria-hidden>•</span>
                      <span className="truncate text-xs normal-case text-muted-foreground">{row.meta}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-5 text-sm text-muted-foreground">
              <span>{priceLabel}</span>
              <div className={cn("flex items-center gap-2 rounded px-3 py-1 text-xs", deltaTone.badge, deltaTone.text)}>
                <span>{deltaLabel}</span>
                <span>{percentLabel}</span>
              </div>
              {row.isPrimary ? null : (
                <button
                  type="button"
                  onClick={() => onRemove?.(row.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition hover:border-border hover:text-foreground"
                  aria-label={`Remove ${row.name} comparison`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 3L9 9"
                      stroke="currentColor"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 3L3 9"
                      stroke="currentColor"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssetAvatar({ src, symbol }: { src?: string | null; symbol: string }) {
  if (src) {
    return (
      <div className="relative h-9 w-9 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={symbol}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-sm font-semibold text-muted-foreground">
      {symbol.slice(0, 3)}
    </div>
  );
}
