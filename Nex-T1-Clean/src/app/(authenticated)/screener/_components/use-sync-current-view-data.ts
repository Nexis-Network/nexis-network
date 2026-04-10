"use client";

import { useEffect, useRef } from "react";

import type { CoinMarketRow } from "@/types/market/market-data";

import { createCurrentViewSignature } from "./assets-table.sorting";

export function useSyncCurrentViewData(args: {
  displayAssets: CoinMarketRow[];
  setCurrentViewData: (assets: CoinMarketRow[]) => void;
}): void {
  const { displayAssets, setCurrentViewData } = args;
  const lastSyncedRef = useRef("");

  useEffect(() => {
    const nextSignature = createCurrentViewSignature(displayAssets);

    if (nextSignature !== lastSyncedRef.current) {
      setCurrentViewData(displayAssets);
      lastSyncedRef.current = nextSignature;
    }
  }, [displayAssets, setCurrentViewData]);
}
