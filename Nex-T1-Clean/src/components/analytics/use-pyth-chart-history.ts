import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { logger } from "@/lib/logger";
import { TIMEFRAME_PRESETS, type TimeframePreset } from "@/modules/prices/pyth/chart-config";

import { sortPresets } from "./pyth-chart.constants";
import {
  applyLatestPricePoint,
  fetchPythHistory,
  fetchPythLatest,
  toLatestInfo,
} from "./pyth-chart-history-client";
import type { LatestInfo, PriceDatum } from "./pyth-chart.types";

type UsePythChartHistoryArgs = {
  activeRangeDays: number;
  activeResolutionMinutes: number;
  priceFeedId?: string;
  resolutionMs: number;
  selectedPreset: TimeframePreset;
  setAvailablePresets: Dispatch<SetStateAction<TimeframePreset[]>>;
  syncToPreset: (preset: TimeframePreset) => void;
  ticker: string;
};

export function usePythChartHistory({
  activeRangeDays,
  activeResolutionMinutes,
  priceFeedId,
  resolutionMs,
  selectedPreset,
  setAvailablePresets,
  syncToPreset,
  ticker,
}: UsePythChartHistoryArgs) {
  const [data, setData] = useState<PriceDatum[]>([]);
  const [latest, setLatest] = useState<LatestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { history } = await fetchPythHistory(
        ticker,
        activeResolutionMinutes,
        activeRangeDays,
      );

      setData(history);

      if (history.length > 0) {
        setAvailablePresets((previous) => {
          if (previous.some((preset) => preset.value === selectedPreset.value)) {
            return previous;
          }

          return sortPresets([...previous, selectedPreset]);
        });
        return;
      }

      let fallbackPreset: TimeframePreset | undefined;
      setAvailablePresets((previous) => {
        if (!previous.some((preset) => preset.value === selectedPreset.value)) {
          return previous;
        }

        const filteredPresets = sortPresets(
          previous.filter((preset) => preset.value !== selectedPreset.value),
        );

        fallbackPreset =
          TIMEFRAME_PRESETS.find((preset) =>
            filteredPresets.some((item) => item.value === preset.value),
          ) ?? filteredPresets[0];

        return filteredPresets;
      });

      if (fallbackPreset) {
        syncToPreset(fallbackPreset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load price history");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeRangeDays,
    activeResolutionMinutes,
    selectedPreset,
    setAvailablePresets,
    syncToPreset,
    ticker,
  ]);

  const fetchLatest = useCallback(async () => {
    try {
      const latestPayload = await fetchPythLatest(ticker, priceFeedId);
      if (!latestPayload) {
        return;
      }

      setLatest(toLatestInfo(latestPayload));
      setData((previous) =>
        applyLatestPricePoint(previous, latestPayload, resolutionMs),
      );
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("Failed to refresh latest price", err);
      }
    }
  }, [priceFeedId, resolutionMs, ticker]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!ticker) {
      return;
    }

    void fetchLatest();
    const interval = setInterval(() => {
      void fetchLatest();
    }, 15_000);

    return () => clearInterval(interval);
  }, [fetchLatest, ticker]);

  return {
    data,
    error,
    isLoading,
    latest,
  };
}
