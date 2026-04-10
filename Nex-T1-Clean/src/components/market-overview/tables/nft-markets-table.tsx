"use client";

import Image from "next/image";
import { useMemo } from "react";
import { PaginatedGridTable } from "@/components/market-overview/tables/paginated-grid-table";
import { formatCurrency } from "@/modules/prices/market-overview/formatters";
import type { NftMarketRow } from "@/types/market";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";

export function NftMarketsTable({ rows, isLoading, isError }: { rows: NftMarketRow[]; isLoading: boolean; isError: boolean }) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isLgUp = useMediaQuery("(min-width: 1024px)");

  const columns = useMemo(() => {
    const collectionColumn = {
      key: "collection",
      header: "Collection",
      width: "minmax(0, 2.2fr)",
      render: (nft: NftMarketRow) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/60">
            {nft.imageUrl ? <Image src={nft.imageUrl} alt={nft.name} fill sizes="36px" className="object-cover" /> : null}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium">{nft.name}</span>
            <span className="truncate text-[11px] uppercase text-muted-foreground">{nft.symbol}</span>
          </div>
        </div>
      ),
    } as const;

    if (isMobile) {
      return [
        collectionColumn,
        {
          key: "stats",
          header: "Stats",
          width: "minmax(0, 1.4fr)",
          align: "right" as const,
          render: (nft: NftMarketRow) => (
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="font-mono font-normal">{formatCurrency(nft.floorPriceUsd ?? null, { currency: "usd" })}</span>
              <span className="text-[11px] text-muted-foreground">
                24h <span className="font-mono font-normal">{formatCurrency(nft.volume24hUsd ?? null, { compact: true, currency: "usd" })}</span>
              </span>
            </div>
          ),
        },
      ];
    }

    const base = [
      collectionColumn,
      {
        key: "floor",
        header: "Floor",
        width: "minmax(0, 1.2fr)",
        align: "right" as const,
        render: (nft: NftMarketRow) => <span className="font-mono font-normal">{formatCurrency(nft.floorPriceUsd ?? null, { currency: "usd" })}</span>,
      },
      {
        key: "vol24",
        header: "24h Volume",
        width: "minmax(0, 1.3fr)",
        align: "right" as const,
        render: (nft: NftMarketRow) => <span className="font-mono font-normal">{formatCurrency(nft.volume24hUsd ?? null, { compact: true, currency: "usd" })}</span>,
      },
      {
        key: "cap",
        header: "Market Cap",
        width: "minmax(0, 1.3fr)",
        align: "right" as const,
        render: (nft: NftMarketRow) => <span className="font-mono font-normal">{formatCurrency(nft.marketCapUsd ?? null, { compact: true, currency: "usd" })}</span>,
      },
    ];

    if (!isLgUp) {
      return base;
    }

    return [
      ...base,
      {
        key: "total",
        header: "Total Volume",
        width: "minmax(0, 1.3fr)",
        align: "right" as const,
        render: (nft: NftMarketRow) => <span className="font-mono font-normal">{formatCurrency(nft.totalVolumeUsd ?? null, { compact: true, currency: "usd" })}</span>,
      },
    ];
  }, [isLgUp, isMobile]);

  return (
    <PaginatedGridTable<NftMarketRow>
      rows={rows}
      isLoading={isLoading}
      isError={isError}
      dataLabel="Data: Moralis NFT market data"
      emptyMessage="No NFT markets available."
      errorMessage="Unable to load NFT markets right now."
      footerExtra={rows?.length ? `${rows.length} items` : ""}
      minWidthPx={840}
      columns={columns}
    />
  );
}
