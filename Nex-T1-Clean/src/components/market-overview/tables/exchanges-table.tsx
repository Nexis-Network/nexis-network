"use client";

import { useMemo } from "react";
import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { formatNumber } from "@/modules/prices/market-overview/formatters";
import type { ExchangeSummary } from "@/types/market";
import { buildExchangeIdentityColumns } from "./shared-exchange-columns";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";

export function ExchangesTable({ rows, isLoading, isError }: { rows: ExchangeSummary[]; isLoading: boolean; isError: boolean }) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const columns = useMemo(() => {
    if (isMobile) {
      return [
        ...buildExchangeIdentityColumns<ExchangeSummary>({ key: "exchange", header: "Exchange" }).filter((col) => col.key !== "country"),
        {
          key: "metrics",
          header: "Metrics",
          width: "minmax(0, 1.4fr)",
          align: "right" as const,
          render: (ex: ExchangeSummary) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="font-medium">Trust {ex.trustScore ?? "—"}</span>
              <span className="text-[11px] text-muted-foreground">
                Vol {formatNumber(ex.tradeVolume24hBtc ?? null, { compact: true, maximumFractionDigits: 2 })}
              </span>
            </div>
          ),
        },
      ];
    }

    return [
      ...buildExchangeIdentityColumns<ExchangeSummary>({ key: "exchange", header: "Exchange" }),
      {
        key: "trust",
        header: "Trust",
        width: "minmax(0, 1fr)",
        render: (ex: ExchangeSummary) => <span className="text-sm font-medium">{ex.trustScore ?? "—"}</span>,
      },
      {
        key: "vol",
        header: "Vol 24h (BTC)",
        width: "minmax(0, 1.4fr)",
        align: "right" as const,
        render: (ex: ExchangeSummary) => formatNumber(ex.tradeVolume24hBtc ?? null, { compact: true, maximumFractionDigits: 2 }),
      },
    ];
  }, [isMobile]);

  return (
    <PaginatedGridTable<ExchangeSummary>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      dataLabel="Data: CoinGecko exchanges"
      emptyMessage="No exchanges available."
      errorMessage="Unable to load exchanges right now."
      minWidthPx={720}
      columns={columns}
    />
  );
}
