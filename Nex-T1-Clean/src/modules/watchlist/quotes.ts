import pMap from "p-map";

import { getCoinSnapshotsByIds, getNftDetails } from "@/server/market/coingecko";
import type { WatchlistItemSnapshot, WatchlistQuote } from "@/types/watchlist";


import { logger } from '@/lib/logger';
const NftConcurrency = 3;

function keyFor(assetId: string, assetType: string) {
  return `${assetType}:${assetId}`.toLowerCase();
}

export async function fetchWatchlistQuotes(
  items: Pick<WatchlistItemSnapshot, "assetId" | "assetType">[],
  vsCurrency: string,
): Promise<Map<string, WatchlistQuote>> {
  const map = new Map<string, WatchlistQuote>();
  if (!items.length) {
    return map;
  }

  const cryptoIds = Array.from(
    new Set(
      items
        .filter((item) => item.assetType === "crypto")
        .map((item) => item.assetId.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (cryptoIds.length) {
    try {
      const rows = await getCoinSnapshotsByIds(cryptoIds, {
        vsCurrency: vsCurrency.toLowerCase(),
      });
      for (const row of rows) {
        map.set(keyFor(row.id, "crypto"), {
          assetId: row.id,
          assetType: "crypto",
          vsCurrency: vsCurrency.toLowerCase(),
          price: row.currentPrice ?? null,
          priceChangePct: row.priceChangePercentage24h ?? null,
          volume24h: row.totalVolume ?? null,
          imageUrl: row.image,
          updatedAt: row.lastUpdated ?? null,
          vendor: "coingecko",
        });
      }
    } catch (error) {
      logger.warn("watchlist_quotes_crypto_error", {
        message: error instanceof Error ? error.message : error,
      });
    }
  }

  const nftIds = Array.from(
    new Set(
      items
        .filter((item) => item.assetType === "nft")
        .map((item) => item.assetId.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (nftIds.length) {
    await pMap(
      nftIds,
      async (id) => {
        try {
          const response = await getNftDetails(id);
          const details = response.data;
          map.set(keyFor(id, "nft"), {
            assetId: id,
            assetType: "nft",
            vsCurrency: "usd", // Coingecko NFT metrics currently USD-only
            price: details.floorPriceUsd ?? details.oneDayAveragePriceUsd ?? null,
            priceChangePct: null,
            volume24h: details.volume24hUsd ?? null,
            imageUrl: details.imageUrl ?? null,
            updatedAt: details.lastUpdated ?? null,
            vendor: "coingecko",
          });
        } catch (error) {
          logger.warn("watchlist_quotes_nft_error", {
            assetId: id,
            message: error instanceof Error ? error.message : error,
          });
        }
      },
      { concurrency: NftConcurrency },
    );
  }

  return map;
}
