"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useScreener } from "@/app/(authenticated)/screener/_context/screener-context";
import { logger } from "@/lib/logger";
import { useWatchlist } from "@/lib/hooks/watchlist/use-watchlist";
import type { CoinMarketRow } from "@/types/market/market-data";
import type { WatchlistItemSnapshot } from "@/types/watchlist";

import { AssetsTableHeader } from "./assets-table-header";
import { AssetsTablePagination } from "./assets-table-pagination";
import { AssetsTableRow } from "./assets-table-row";
import { AssetsTableSkeleton } from "./assets-table-skeleton";
import {
  SCREENER_TABLE_SCROLL_AREA_CLASS,
  SCREENER_TABLE_SURFACE_CLASS,
} from "./assets-table.constants";
import { getAssetRoute, getAssetTokenAddress } from "./assets-table.utils";
import { useAssetsTableData } from "./use-assets-table-data";

interface AssetsTableProps {
  onSwap: (asset: CoinMarketRow) => void;
}

function buildWatchlistMap(items: WatchlistItemSnapshot[]): Map<string, WatchlistItemSnapshot> {
  return new Map(
    items.map((item) => [item.assetId.toLowerCase(), item]),
  );
}

export function AssetsTable({ onSwap }: AssetsTableProps) {
  const router = useRouter();
  const {
    narrativeFilter,
    safetyFilter,
    searchQuery,
    selectedChain,
    setCurrentViewData,
  } = useScreener();
  const {
    addItem,
    isMutating,
    items,
    removeItem,
  } = useWatchlist("usd");
  const {
    displayAssets,
    handleSort,
    initialAssets,
    isLoading,
    limit,
    page,
    setPage,
    setRowRef,
    sortConfig,
  } = useAssetsTableData({
    narrativeFilter: narrativeFilter ?? "",
    safetyFilter,
    searchQuery,
    selectedChain,
    setCurrentViewData,
  });

  const watchlistMap = useMemo(() => buildWatchlistMap(items), [items]);

  const handleAssetOpen = useCallback(
    (asset: CoinMarketRow) => {
      router.push(getAssetRoute(asset));
    },
    [router],
  );

  const handleCopyAddress = useCallback((asset: CoinMarketRow) => {
    void navigator.clipboard.writeText(getAssetTokenAddress(asset.id));
  }, []);

  const handleToggleWatchlist = useCallback(
    async (asset: CoinMarketRow, watchlistItemId?: string) => {
      const tokenAddress = getAssetTokenAddress(asset.id);

      try {
        if (watchlistItemId) {
          await removeItem(watchlistItemId);
          return;
        }

        await addItem({
          assetId: tokenAddress,
          assetType: "crypto",
          displayName: asset.name,
          metadata: {},
          source: "birdeye",
          symbol: asset.symbol,
        });
      } catch (error) {
        logger.error("Watchlist error:", error);
      }
    },
    [addItem, removeItem],
  );

  if (isLoading && initialAssets.length === 0) {
    return <AssetsTableSkeleton />;
  }

  if (initialAssets.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-2 py-20 text-sm text-[var(--screener-table-muted)]">
        <span>No assets found.</span>
        <span className="text-xs text-[var(--screener-table-subtle)]">
          Try adjusting your filters.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`screener-table-surface relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden ${SCREENER_TABLE_SURFACE_CLASS}`}
    >
      <div className={SCREENER_TABLE_SCROLL_AREA_CLASS}>
        <div className="w-full min-w-[1150px]">
          <AssetsTableHeader sortConfig={sortConfig} onSort={handleSort} />
          <div className="flex flex-col">
            {displayAssets.map((asset, index) => {
              const watchlistItem = watchlistMap.get(getAssetTokenAddress(asset.id).toLowerCase());

              return (
                <AssetsTableRow
                  key={`${asset.id}-${index}`}
                  asset={asset}
                  index={index}
                  isInWatchlist={Boolean(watchlistItem)}
                  isWatchlistMutating={isMutating}
                  limit={limit}
                  onAssetOpen={handleAssetOpen}
                  onCopyAddress={handleCopyAddress}
                  onSwap={onSwap}
                  onToggleWatchlist={handleToggleWatchlist}
                  page={page}
                  setRowRef={setRowRef}
                  watchlistItemId={watchlistItem?.id}
                />
              );
            })}
          </div>
        </div>
      </div>

      <AssetsTablePagination
        hasMore={initialAssets.length >= limit}
        isLoading={isLoading}
        limit={limit}
        page={page}
        setPage={setPage}
      />
    </div>
  );
}
