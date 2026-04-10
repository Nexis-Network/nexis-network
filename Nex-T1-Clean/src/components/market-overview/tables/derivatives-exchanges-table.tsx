"use client";

import { useMemo } from "react";
import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { formatNumber } from "@/modules/prices/market-overview/formatters";
import type { DerivativesExchangeSummary } from "@/types/market";
import { buildExchangeIdentityColumns } from "./shared-exchange-columns";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";

export function DerivativesExchangesTable({ rows, isLoading, isError }: { rows: DerivativesExchangeSummary[]; isLoading: boolean; isError: boolean }) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const columns = useMemo(() => {
    if (isMobile) {
      return [
        ...buildExchangeIdentityColumns<DerivativesExchangeSummary>({ key: "venue", header: "Venue" }).filter((col) => col.key !== "country"),
        {
          key: "metrics",
          header: "Metrics",
          width: "minmax(0, 1.6fr)",
          align: "right" as const,
          render: (ex: DerivativesExchangeSummary) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="font-medium">
                OI {formatNumber(ex.openInterestBtc ?? null, { compact: true, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Vol {formatNumber(ex.tradeVolume24hBtc ?? null, { compact: true, maximumFractionDigits: 2 })}
              </span>
            </div>
          ),
        },
      ];
    }

    return [
      ...buildExchangeIdentityColumns<DerivativesExchangeSummary>({ key: "venue", header: "Venue" }),
      {
        key: "vol",
        header: "Vol 24h (BTC)",
        width: "minmax(0, 1.4fr)",
        align: "right" as const,
        render: (ex: DerivativesExchangeSummary) => formatNumber(ex.tradeVolume24hBtc ?? null, { compact: true, maximumFractionDigits: 2 }),
      },
      {
        key: "oi",
        header: "Open Interest",
        width: "minmax(0, 1.4fr)",
        align: "right" as const,
        render: (ex: DerivativesExchangeSummary) => formatNumber(ex.openInterestBtc ?? null, { compact: true, maximumFractionDigits: 2 }),
      },
    ];
  }, [isMobile]);

  return (
    <PaginatedGridTable<DerivativesExchangeSummary>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      dataLabel="Data: CoinGecko derivatives exchanges"
      emptyMessage="No derivatives venues available."
      errorMessage="Unable to load derivatives exchanges right now."
      minWidthPx={720}
      columns={columns}
    />
  );
}
