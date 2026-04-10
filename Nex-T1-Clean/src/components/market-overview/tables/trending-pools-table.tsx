"use client";

import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { formatCurrency, formatNumber } from "@/modules/prices/market-overview/formatters";
import type { TrendingPoolSummary } from "@/types/market";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";
import { useMemo } from "react";

export function TrendingPoolsTable({ pools, isLoading, isError }: { pools: TrendingPoolSummary[]; isLoading: boolean; isError: boolean }) {
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");
  const isXlUp = useMediaQuery("(min-width: 1280px)");

  const columns = useMemo(() => {
    if (!isMdUp) {
      return [
        {
          key: "pair",
          header: "Pair",
          width: "minmax(0, 2.2fr)",
          render: (p: TrendingPoolSummary) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {p.baseToken.symbol ?? p.baseToken.name}/{p.quoteToken.symbol ?? p.quoteToken.name}
              </span>
              <span className="truncate text-[11px] uppercase text-muted-foreground">
                {(p.dex || "DEX").trim()} · {(p.network || "network").trim()}
              </span>
            </div>
          ),
        },
        {
          key: "stats",
          header: "Stats",
          width: "minmax(0, 1.6fr)",
          align: "right" as const,
          render: (p: TrendingPoolSummary) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="font-mono font-normal">{formatCurrency(p.priceUsd ?? null, { compact: false })}</span>
              <span className="text-[11px] text-muted-foreground">
                Vol <span className="font-mono font-normal">{formatCurrency(p.volume24hUsd ?? null, { compact: true })}</span>
                {" · "}
                Liq <span className="font-mono font-normal">{formatCurrency(p.liquidityUsd ?? null, { compact: true })}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">Txns <span className="font-mono font-normal">{formatNumber(p.transactions24h ?? null, { compact: true })}</span></span>
            </div>
          ),
        },
      ];
    }

    const pairColumn = {
      key: "pair",
      header: "Base / Quote",
      width: "minmax(0, 2.2fr)",
      render: (p: TrendingPoolSummary) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">
            {p.baseToken.symbol ?? p.baseToken.name}/{p.quoteToken.symbol ?? p.quoteToken.name}
          </span>
          <span className="truncate text-[11px] uppercase text-muted-foreground">{p.dex}</span>
        </div>
      ),
    } as const;

    const priceColumn = {
      key: "price",
      header: "Price",
      width: "minmax(0, 1.2fr)",
      align: "right" as const,
      render: (p: TrendingPoolSummary) => <span className="font-mono font-normal">{formatCurrency(p.priceUsd ?? null, { compact: false })}</span>,
    } as const;

    const volColumn = {
      key: "vol24",
      header: "24h Volume",
      width: "minmax(0, 1.3fr)",
      align: "right" as const,
      render: (p: TrendingPoolSummary) => <span className="font-mono font-normal">{formatCurrency(p.volume24hUsd ?? null, { compact: true })}</span>,
    } as const;

    const liqColumn = {
      key: "liq",
      header: "Liquidity",
      width: "minmax(0, 1.3fr)",
      align: "right" as const,
      render: (p: TrendingPoolSummary) => <span className="font-mono font-normal">{formatCurrency(p.liquidityUsd ?? null, { compact: true })}</span>,
    } as const;

    const txnsColumn = {
      key: "txns",
      header: "Txns (24h)",
      width: "minmax(0, 1.2fr)",
      align: "right" as const,
      render: (p: TrendingPoolSummary) => <span className="font-mono font-normal">{formatNumber(p.transactions24h ?? null, { compact: true })}</span>,
    } as const;

    const networkColumn = {
      key: "network",
      header: "Network",
      width: "minmax(0, 1.1fr)",
      render: (p: TrendingPoolSummary) => <span className="capitalize">{p.network}</span>,
    } as const;

    if (!isLgUp) {
      return [pairColumn, networkColumn, priceColumn, volColumn];
    }

    if (!isXlUp) {
      return [pairColumn, networkColumn, priceColumn, volColumn, liqColumn, txnsColumn];
    }

    return [
      {
        key: "pool",
        header: "Pool",
        width: "minmax(0, 1.6fr)",
        render: (pool: TrendingPoolSummary) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate leading-tight">{pool.poolAddress.slice(0, 8)}…{pool.poolAddress.slice(-6)}</span>
            <span className="truncate text-[11px] uppercase text-muted-foreground">{pool.id}</span>
          </div>
        ),
      },
      networkColumn,
      { key: "dex", header: "DEX", width: "minmax(0, 1.1fr)", render: (p: TrendingPoolSummary) => p.dex },
      pairColumn,
      priceColumn,
      volColumn,
      liqColumn,
      txnsColumn,
    ];
  }, [isLgUp, isMdUp, isXlUp]);

  return (
    <PaginatedGridTable<TrendingPoolSummary>
      rows={pools}
      isLoading={isLoading}
      isError={isError}
      minWidthPx={880}
      dataLabel="Trending pools"
      emptyMessage="No trending pools available."
      errorMessage="Unable to load trending pools right now."
      columns={columns}
    />
  );
}
