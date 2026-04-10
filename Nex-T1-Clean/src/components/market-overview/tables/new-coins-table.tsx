"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { DexPairSummary } from "@/types/market";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";
import { cn } from "@/lib/utils";

export function NewCoinsTable({ rows, isLoading, isError }: { rows: DexPairSummary[]; isLoading: boolean; isError: boolean }) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const columns = useMemo(() => {
    const assetColumn = {
      key: "asset",
      header: "Asset",
      width: "minmax(0, 2.2fr)",
      render: (pair: DexPairSummary) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9 shrink-0 border border-border/60 bg-muted/60 text-xs font-semibold uppercase tracking-[0.16px] text-foreground">
            {pair.baseToken.logoUrl ? (
              <AvatarImage asChild>
                <Image
                  src={pair.baseToken.logoUrl}
                  alt={pair.baseToken.name ?? pair.baseToken.symbol ?? "Token"}
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-full w-full object-cover"
                />
              </AvatarImage>
            ) : null}
            <AvatarFallback>{pair.baseToken.symbol?.slice(0, 3) ?? ""}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="max-w-[140px] truncate font-medium">{pair.baseToken.name ?? "Unknown"}</span>
            <span className="text-[11px] uppercase text-muted-foreground">{pair.baseToken.symbol ?? "—"}</span>
          </div>
        </div>
      ),
    } as const;

    if (isMobile) {
      return [
        assetColumn,
        {
          key: "stats",
          header: "Stats",
          width: "minmax(0, 1.4fr)",
          align: "right" as const,
          render: (pair: DexPairSummary) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-mono font-normal">{formatCurrency(pair.priceUsd ?? null, { currency: "usd" })}</span>
                <span
                  className={cn(
                    "text-[12px] font-mono font-normal",
                    pair.priceChangePercent24h == null
                      ? "text-muted-foreground"
                      : pair.priceChangePercent24h >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                  )}
                  title={pair.priceChangePercent24h?.toFixed?.(2) ?? undefined}
                >
                  {formatPercentage(pair.priceChangePercent24h ?? null, { sign: true })}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Vol <span className="font-mono font-normal">{formatCurrency(pair.volumeUsd24h ?? null, { compact: true, currency: "usd" })}</span> · Liq{" "}
                <span className="font-mono font-normal">{formatCurrency(pair.liquidityUsd ?? null, { compact: true, currency: "usd" })}</span>
              </div>
            </div>
          ),
        },
      ];
    }

    return [
      assetColumn,
      {
        key: "price",
        header: "Price",
        width: "minmax(0, 1fr)",
        align: "right" as const,
        render: (pair: DexPairSummary) => <span className="font-mono font-normal">{formatCurrency(pair.priceUsd ?? null, { currency: "usd" })}</span>,
      },
      {
        key: "change",
        header: "24h %",
        width: "minmax(0, 1fr)",
        align: "right" as const,
        render: (pair: DexPairSummary) => (
          <span
            className={cn("font-mono font-normal",
              pair.priceChangePercent24h == null
                ? "text-muted-foreground"
                : pair.priceChangePercent24h >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
            )}
            title={pair.priceChangePercent24h?.toFixed?.(2) ?? undefined}
          >
            {formatPercentage(pair.priceChangePercent24h ?? null, { sign: true })}
          </span>
        ),
      },
      {
        key: "volume",
        header: "Volume",
        width: "minmax(0, 1fr)",
        align: "right" as const,
        render: (pair: DexPairSummary) => <span className="font-mono font-normal">{formatCurrency(pair.volumeUsd24h ?? null, { compact: true, currency: "usd" })}</span>,
      },
      {
        key: "liquidity",
        header: "Liquidity",
        width: "minmax(0, 1.1fr)",
        align: "right" as const,
        render: (pair: DexPairSummary) => <span className="font-mono font-normal">{formatCurrency(pair.liquidityUsd ?? null, { compact: true, currency: "usd" })}</span>,
      },
    ];
  }, [isMobile]);

  return (
    <PaginatedGridTable<DexPairSummary>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      dataLabel="Data: DexTools new pairs (fallback DexScreener)"
      footerExtra={
        <span className="inline-flex items-center gap-1">
          New pairs <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      }
      emptyMessage="No fresh listings available."
      errorMessage="Unable to load fresh listings right now."
      minWidthPx={720}
      columns={columns}
    />
  );
}
