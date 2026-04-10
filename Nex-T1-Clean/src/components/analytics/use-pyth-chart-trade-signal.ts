import { useCallback, useEffect, useState } from "react";

import type { TradeSignal } from "./pyth-chart.types";

type UsePythChartTradeSignalResult = {
  isSignalLoading: boolean;
  retryTradeSignal: () => void;
  signalError: string | null;
  tradeSignal: TradeSignal | null;
};

export function usePythChartTradeSignal(
  primarySymbol: string | null,
): UsePythChartTradeSignalResult {
  const [tradeSignal, setTradeSignal] = useState<TradeSignal | null>(null);
  const [isSignalLoading, setIsSignalLoading] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);

  const fetchTradeSignal = useCallback(async () => {
    const assetSymbol = primarySymbol?.toLowerCase();
    if (!assetSymbol) {
      setTradeSignal(null);
      setSignalError(null);
      return;
    }

    setIsSignalLoading(true);
    setSignalError(null);

    try {
      const response = await fetch(
        `/api/tokenmetrics/trade-signal?asset=${encodeURIComponent(assetSymbol)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        data: {
          indicator: string;
          direction: string;
          score: number | null;
          updatedAt: string | null;
        } | null;
        error?: string | null;
      };

      if (!response.ok) {
        throw new Error(
          payload?.error?.trim() || `Signal request failed (${response.status})`,
        );
      }

      const nextSignal = payload?.data
        ? {
            indicator: payload.data.indicator,
            direction:
              typeof payload.data.direction === "string"
                ? (payload.data.direction.toLowerCase() as TradeSignal["direction"])
                : "neutral",
            score:
              typeof payload.data.score === "number" ? payload.data.score : null,
            updatedAt: payload.data.updatedAt,
          }
        : null;

      setTradeSignal(nextSignal);
      setSignalError(
        !nextSignal && typeof payload?.error === "string" && payload.error.trim()
          ? payload.error
          : null,
      );
    } catch (err) {
      setTradeSignal(null);
      setSignalError(
        err instanceof Error ? err.message : "Unable to load Token Metrics signal",
      );
    } finally {
      setIsSignalLoading(false);
    }
  }, [primarySymbol]);

  useEffect(() => {
    void fetchTradeSignal();
  }, [fetchTradeSignal]);

  const retryTradeSignal = useCallback(() => {
    void fetchTradeSignal();
  }, [fetchTradeSignal]);

  return {
    isSignalLoading,
    retryTradeSignal,
    signalError,
    tradeSignal,
  };
}
