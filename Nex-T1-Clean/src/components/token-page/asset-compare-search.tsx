"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useDebounce } from "use-debounce";

import { useAssetCompareSearch } from "@/hooks/token-page";
import { formatCurrency, formatNumber, formatPercentage } from "@/modules/prices/market-overview/formatters";
import { cn } from "@/lib/utils";
import type { CompareAssetSearchItem } from "@/types/token-page";

const POSITIVE_BG = "bg-primary/10";
const POSITIVE_TEXT = "text-primary";
const NEGATIVE_BG = "bg-destructive/10";
const NEGATIVE_TEXT = "text-destructive";

function sanitizeItems(items: CompareAssetSearchItem[] | undefined, exclude: Set<string>) {
  if (!items?.length) return [];
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.assetType}:${item.slug}`.toLowerCase();
    if (exclude.has(key) || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(item.slug);
  });
}

function AssetAvatar({ src, symbol }: { src?: string | null; symbol: string }) {
  if (src) {
    return (
      <div className="relative h-8 w-8 overflow-hidden rounded-md">
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
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-xs font-medium text-muted-foreground">
      {symbol.slice(0, 3)}
    </div>
  );
}

export type AssetCompareSearchProps = {
  onSelect: (item: CompareAssetSearchItem) => void;
  excludeIds: string[];
  suggestions?: CompareAssetSearchItem[];
  className?: string;
};

export function AssetCompareSearch({ onSelect, excludeIds, suggestions, className }: AssetCompareSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [debouncedQuery] = useDebounce(query, 250);
  const normalizedExclude = useMemo(() => new Set(excludeIds.map((id) => id.toLowerCase())), [excludeIds]);
  const search = useAssetCompareSearch(debouncedQuery, { enabled: isOpen });

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  const trimmedQuery = query.trim();
  const hasActiveQuery = trimmedQuery.length >= 2;

  const fallbackSuggestions = useMemo(
    () => sanitizeItems(suggestions, normalizedExclude).slice(0, 6),
    [suggestions, normalizedExclude],
  );

  const results = useMemo(() => {
    if (!hasActiveQuery) {
      return fallbackSuggestions;
    }
    return sanitizeItems(search.data, normalizedExclude);
  }, [fallbackSuggestions, hasActiveQuery, search.data, normalizedExclude]);

  const showResults = isOpen && (results.length > 0 || search.isLoading || hasActiveQuery);

  const handleSelect = (item: CompareAssetSearchItem) => {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative mx-auto w-full max-w-[861.09px]", className)}
    >
      <div className="relative h-9 w-full">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Compare to..."
          className="h-full w-full rounded-full border border-transparent bg-muted/20 pl-11 pr-5 text-sm font-light tracking-[0.16px] text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M11.333 11.333L14.0002 14.0002"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>

      {showResults ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-xl border border-border bg-popover backbackdrop-blur-lg shadow-lg">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs font-light tracking-[0.16px] text-muted-foreground">
            <span>{hasActiveQuery ? "Matches" : "Suggested"}</span>
            {search.isFetching ? <span className="text-[10px] uppercase text-muted-foreground/50">Updating…</span> : null}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {search.isLoading && hasActiveQuery ? (
              <div className="flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">
                Searching assets…
              </div>
            ) : null}
            {!results.length && !search.isLoading ? (
              <div className="flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">
                {hasActiveQuery ? "No assets match that search." : "No nearby matches available."}
              </div>
            ) : null}
            {results.map((item) => {
              const percent = item.priceChangePercent24h ?? null;
              const absolute = item.priceChangeUsd24h ?? null;
              const isPositive = percent != null ? percent >= 0 : absolute != null ? absolute >= 0 : null;
              const deltaBg = isPositive == null ? "bg-transparent" : isPositive ? POSITIVE_BG : NEGATIVE_BG;
              const deltaText = isPositive == null ? "text-muted-foreground" : isPositive ? POSITIVE_TEXT : NEGATIVE_TEXT;
              const formattedPrice = item.priceUsd != null
                ? formatCurrency(item.priceUsd, { currency: "USD" })
                : item.priceNative != null
                  ? `${item.nativeSymbol ?? ""} ${formatNumber(item.priceNative, { maximumFractionDigits: 4 })}`.trim()
                  : "--";
              const formattedChange = absolute != null
                ? formatCurrency(absolute, { currency: "USD", signDisplay: "always" })
                : "--";
              const formattedPercent = percent != null
                ? formatPercentage(percent / 100, { sign: true })
                : "--";
              const symbol = item.symbol ? item.symbol.toUpperCase() : "--";

              return (
                <button
                  key={`${item.assetType}:${item.slug}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="group flex w-full items-center gap-6 px-4 py-[14px] text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <AssetAvatar src={item.logoUrl} symbol={symbol} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-1 text-[11px] font-light uppercase tracking-[0.16px] text-muted-foreground">
                        <span>{symbol}</span>
                        <span aria-hidden>•</span>
                        <span>{item.assetType === "nft" ? "NFT" : "Token"}</span>
                        {item.marketCapRank != null ? (
                          <>
                            <span aria-hidden>•</span>
                            <span>Rank #{item.marketCapRank}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground/70">
                    <span>{formattedPrice}</span>
                    <div className={cn("flex items-center gap-2 rounded px-[9px] py-[2px] text-[11px]", deltaBg, deltaText)}>
                      <span>{formattedChange}</span>
                      <span>{formattedPercent}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

