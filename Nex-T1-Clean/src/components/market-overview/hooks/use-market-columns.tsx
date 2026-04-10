"use client";

import Image from "next/image";
import { useCallback, useMemo } from "react";
import type { CellContext, ColumnDef } from "@tanstack/react-table";

import { Sparkline } from "@/components/analytics/lazy-components";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercentage, getDeltaTone } from "@/modules/prices/market-overview/formatters";
import type { CoinMarketRow } from "@/types/market";

export type ColumnDisplayMeta = {
  size?: string;
  align?: "left" | "right" | "center";
};

export const COLUMN_LABELS: Record<string, string> = {
  change1h: "1h %",
  change24h: "24h %",
  change7d: "7d %",
  marketCap: "Market Cap",
  volume24h: "24h Volume",
  supply: "Circulating Supply",
  sparkline: "7d",
};

export function useMarketColumns(currency: string, timeframe: "1h" | "24h" | "7d") {
  const renderCurrencyCell = useCallback(
    (value: number | null | undefined, { compact = true }: { compact?: boolean } = {}) => {
      if (value == null || Number.isNaN(value)) {
        return "—";
      }

      const baseValue = formatCurrency(value, { compact, currency });

      if (!compact) {
        return baseValue;
      }

      const fullValue = formatCurrency(value, { compact: false, currency });

      if (baseValue === fullValue) {
        return baseValue;
      }

      return (
        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <span className="cursor-help">{baseValue}</span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="font-mono text-xs">{fullValue}</span>
          </TooltipContent>
        </Tooltip>
      );
    },
    [currency],
  );

  const columns = useMemo<ColumnDef<CoinMarketRow, UntypedJson>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        accessorFn: (row) => row.marketCapRank ?? null,
        enableSorting: true,
        meta: { size: "80px", align: "right" } satisfies ColumnDisplayMeta,
        cell: (info) => <span>{info.getValue<number | null>() ?? "—"}</span>,
      },
      {
        id: "asset",
        header: "Name",
        accessorFn: (row) => row.name,
        enableSorting: false,
        meta: { size: "minmax(180px, 1.5fr)" } satisfies ColumnDisplayMeta,
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
                {original.image ? (
                  <Image src={original.image} alt={original.name} fill sizes="36px" />
                ) : null}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{original.name}</span>
                <span className="text-xs uppercase text-muted-foreground">{original.symbol}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "price",
        header: "Price",
        accessorFn: (row) => row.currentPrice ?? null,
        enableSorting: true,
        meta: { size: "minmax(120px, 1fr)", align: "right" } satisfies ColumnDisplayMeta,
        cell: (context: CellContext<CoinMarketRow, UntypedJson>) =>
          renderCurrencyCell(context.getValue<number | null>(), { compact: false }),
      },
      ...(["change1h", "change24h", "change7d"] as const).map((columnId) => ({
        id: columnId,
        header: COLUMN_LABELS[columnId],
        accessorFn: (row: CoinMarketRow) => {
          if (columnId === "change1h") return row.priceChangePercentage1h ?? null;
          if (columnId === "change24h") return row.priceChangePercentage24h ?? null;
          return row.priceChangePercentage7d ?? null;
        },
        enableSorting: true,
        meta: { size: "minmax(120px, 1fr)", align: "right" } satisfies ColumnDisplayMeta,
        cell: (context: CellContext<CoinMarketRow, UntypedJson>) => {
          const value = context.getValue<number | null>();
          const tone = getDeltaTone(value);
          const isActive =
            (columnId === "change1h" && timeframe === "1h")
            || (columnId === "change24h" && timeframe === "24h")
            || (columnId === "change7d" && timeframe === "7d");
          return (
            <span
              className={cn(
                "font-medium",
                tone === "positive" && "text-emerald-400",
                tone === "negative" && "text-red-400",
                isActive && "underline decoration-dotted decoration-foreground/40",
              )}
            >
              {formatPercentage(value, { sign: true })}
            </span>
          );
        },
      })),
      {
        id: "marketCap",
        header: COLUMN_LABELS.marketCap,
        accessorFn: (row) => row.marketCap ?? null,
        enableSorting: true,
        meta: { size: "minmax(160px, 1fr)", align: "right" } satisfies ColumnDisplayMeta,
        cell: (context: CellContext<CoinMarketRow, UntypedJson>) =>
          renderCurrencyCell(context.getValue<number | null>()),
      },
      {
        id: "volume24h",
        header: COLUMN_LABELS.volume24h,
        accessorFn: (row) => row.totalVolume ?? null,
        enableSorting: true,
        meta: { size: "minmax(160px, 1fr)", align: "right" } satisfies ColumnDisplayMeta,
        cell: (context: CellContext<CoinMarketRow, UntypedJson>) =>
          renderCurrencyCell(context.getValue<number | null>()),
      },
      {
        id: "supply",
        header: COLUMN_LABELS.supply,
        accessorFn: (row) => row.circulatingSupply ?? null,
        enableSorting: false,
        meta: { size: "minmax(180px, 1fr)", align: "right" } satisfies ColumnDisplayMeta,
        cell: ({ row }) => {
          const circulating = row.original.circulatingSupply;
          const max = row.original.maxSupply;
          return (
            <div className="flex flex-col items-end text-xs text-muted-foreground">
              <span>{formatNumber(circulating, { compact: true, maximumFractionDigits: 2 })}</span>
              <span>{max ? formatNumber(max, { compact: true, maximumFractionDigits: 2 }) : "∞"}</span>
            </div>
          );
        },
      },
      {
        id: "sparkline",
        header: COLUMN_LABELS.sparkline,
        accessorFn: (row) => row.sparkline7d ?? [],
        enableSorting: false,
        meta: { size: "minmax(160px, 1fr)" } satisfies ColumnDisplayMeta,
        cell: ({ row }) => (
          <Sparkline
            values={row.original.sparkline7d ?? []}
            tone={getDeltaTone(row.original.priceChangePercentage7d ?? null)}
            className="h-12 w-full"
          />
        ),
      },
    ],
    [timeframe, renderCurrencyCell],
  );

  return columns;
}

