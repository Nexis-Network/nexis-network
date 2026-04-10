"use client";

import { useMemo } from "react";

import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { SpotEtfFlowRow } from "@/types/market";

export function SpotEtfFlowsTable({ rows, isLoading, isError }: { rows: SpotEtfFlowRow[]; isLoading: boolean; isError: boolean }) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const columns = useMemo(() => {
    if (isMobile) {
      return [
        {
          key: "etf",
          header: "ETF",
          width: "minmax(0, 1.6fr)",
          render: (row: SpotEtfFlowRow) => (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{row.ticker ?? "—"}</span>
                <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {row.asset}
                </span>
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {row.institute ?? "—"}
              </div>
            </div>
          ),
        },
        {
          key: "flows",
          header: "Flows",
          width: "minmax(0, 1.2fr)",
          align: "right" as const,
          render: (row: SpotEtfFlowRow) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="font-medium">
                {formatCurrency(row.dailyNetInflowUsd, { compact: true, signDisplay: "always" })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                AUM {formatCurrency(row.netAssetsUsd, { compact: true })}
              </span>
            </div>
          ),
        },
      ];
    }

    return [
      {
        key: "etf",
        header: "ETF",
        width: "minmax(0, 1.8fr)",
        render: (row: SpotEtfFlowRow) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{row.ticker ?? "—"}</span>
              <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {row.asset}
              </span>
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{row.institute ?? "—"}</div>
          </div>
        ),
      },
      {
        key: "aum",
        header: "Net assets",
        width: "minmax(0, 1.2fr)",
        align: "right" as const,
        render: (row: SpotEtfFlowRow) => formatCurrency(row.netAssetsUsd, { compact: true }),
      },
      {
        key: "daily",
        header: "Daily inflow",
        width: "minmax(0, 1.2fr)",
        align: "right" as const,
        render: (row: SpotEtfFlowRow) => formatCurrency(row.dailyNetInflowUsd, { compact: true, signDisplay: "always" }),
      },
      {
        key: "traded",
        header: "Traded",
        width: "minmax(0, 1.2fr)",
        align: "right" as const,
        render: (row: SpotEtfFlowRow) => formatCurrency(row.dailyValueTradedUsd, { compact: true }),
      },
      {
        key: "fee",
        header: "Fee",
        width: "minmax(0, 1fr)",
        align: "right" as const,
        render: (row: SpotEtfFlowRow) => formatPercentage(row.fee, { sign: false, maximumFractionDigits: 2 }),
      },
    ];
  }, [isMobile]);

  return (
    <PaginatedGridTable<SpotEtfFlowRow>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      pageSize={10}
      dataLabel="Data: SoSoValue spot ETFs"
      emptyMessage="No spot ETF flow data available."
      errorMessage="Unable to load spot ETF flows right now."
      minWidthPx={720}
      columns={columns}
    />
  );
}

