"use client";

import type { CoinMarketRow } from "@/types/market/market-data";

import type {
  AssetsTableSortConfig,
  AssetsTableSortKey,
} from "./assets-table.types";
import type { ScreenerSignalBadge } from "./assets-table.constants";

function compareAssets(
  sortConfig: AssetsTableSortConfig,
  leftAsset: CoinMarketRow,
  rightAsset: CoinMarketRow,
): number {
  const key = sortConfig.key as keyof CoinMarketRow;
  const leftValue =
    sortConfig.key === "signal"
      ? leftAsset.priceChangePercentage24h || 0
      : leftAsset[key];
  const rightValue =
    sortConfig.key === "signal"
      ? rightAsset.priceChangePercentage24h || 0
      : rightAsset[key];

  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === null || leftValue === undefined) {
    return sortConfig.direction === "asc" ? 1 : -1;
  }

  if (rightValue === null || rightValue === undefined) {
    return sortConfig.direction === "asc" ? -1 : 1;
  }

  if (typeof leftValue === "string" && typeof rightValue === "string") {
    return sortConfig.direction === "asc"
      ? leftValue.localeCompare(rightValue)
      : rightValue.localeCompare(leftValue);
  }

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return sortConfig.direction === "asc"
      ? leftValue - rightValue
      : rightValue - leftValue;
  }

  return 0;
}

export function sortAssets(
  assets: CoinMarketRow[],
  sortConfig: AssetsTableSortConfig,
): CoinMarketRow[] {
  if (!sortConfig.direction) {
    return assets;
  }

  return [...assets].sort((leftAsset, rightAsset) =>
    compareAssets(sortConfig, leftAsset, rightAsset),
  );
}

export function getNextSortConfig(
  currentSort: AssetsTableSortConfig,
  nextKey: AssetsTableSortKey,
): AssetsTableSortConfig {
  if (currentSort.key !== nextKey) {
    return { key: nextKey, direction: "desc" };
  }

  if (currentSort.direction === "desc") {
    return { key: nextKey, direction: "asc" };
  }

  if (currentSort.direction === "asc") {
    return { key: nextKey, direction: null };
  }

  return { key: nextKey, direction: "desc" };
}

export function createCurrentViewSignature(displayAssets: CoinMarketRow[]): string {
  return JSON.stringify(
    displayAssets.slice(0, 10).map((asset) => `${asset.id}:${asset.currentPrice}`),
  );
}

export function getSignalBadge(change24h: number): ScreenerSignalBadge {
  if (change24h > 5) {
    return {
      label: "Strong Buy",
      style: {
        backgroundColor:
          "color-mix(in oklab, var(--screener-table-positive) 12%, transparent)",
        color: "var(--screener-table-positive)",
      },
    };
  }

  if (change24h > 1) {
    return {
      label: "Buy",
      style: {
        backgroundColor:
          "color-mix(in oklab, var(--screener-table-positive) 8%, transparent)",
        color: "var(--screener-table-positive)",
      },
    };
  }

  if (change24h < -5) {
    return {
      label: "Strong Sell",
      style: {
        backgroundColor:
          "color-mix(in oklab, var(--screener-table-negative) 12%, transparent)",
        color: "var(--screener-table-negative)",
      },
    };
  }

  if (change24h < -1) {
    return {
      label: "Sell",
      style: {
        backgroundColor:
          "color-mix(in oklab, var(--screener-table-negative) 8%, transparent)",
        color: "var(--screener-table-negative)",
      },
    };
  }

  return {
    label: "Neutral",
    style: {
      backgroundColor:
        "color-mix(in oklab, var(--screener-table-muted) 10%, transparent)",
      color: "var(--screener-table-muted)",
    },
  };
}
