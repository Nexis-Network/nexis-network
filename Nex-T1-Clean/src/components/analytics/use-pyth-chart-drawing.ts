import { useCallback, useEffect, useState } from "react";

import { createTrendLineId, toTrendPoint } from "./pyth-chart-trend";
import type {
  ChartPointerState,
  TrendLineShape,
} from "./pyth-chart.types";

type UsePythChartDrawingArgs = {
  activeRangeDays: number;
  activeResolutionMinutes: number;
  ticker: string;
};

export function usePythChartDrawing({
  activeRangeDays,
  activeResolutionMinutes,
  ticker,
}: UsePythChartDrawingArgs) {
  const [trendLines, setTrendLines] = useState<TrendLineShape[]>([]);
  const [draftLine, setDraftLine] = useState<TrendLineShape | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setTrendLines([]);
    setDraftLine(null);
    setIsDrawing(false);
  }, [activeRangeDays, activeResolutionMinutes, ticker]);

  const extractTrendPoint = useCallback((state?: ChartPointerState) => {
    return toTrendPoint(state?.activePayload?.[0]?.payload);
  }, []);

  const handleChartPointerDown = useCallback(
    (state?: ChartPointerState) => {
      if (!isDrawMode) {
        return;
      }

      const startPoint = extractTrendPoint(state);
      if (!startPoint) {
        return;
      }

      setIsDrawing(true);
      setDraftLine({ id: "draft", start: startPoint, end: startPoint });
    },
    [extractTrendPoint, isDrawMode],
  );

  const handleChartPointerMove = useCallback(
    (state?: ChartPointerState) => {
      if (!isDrawMode) {
        return;
      }

      setDraftLine((current) => {
        if (!isDrawing || !current) {
          return current;
        }

        const nextPoint = extractTrendPoint(state);
        return nextPoint ? { ...current, end: nextPoint } : current;
      });
    },
    [extractTrendPoint, isDrawMode, isDrawing],
  );

  const handleChartPointerUp = useCallback(
    (state?: ChartPointerState) => {
      if (!isDrawMode) {
        return;
      }

      setIsDrawing(false);
      setDraftLine((current) => {
        if (!current) {
          return null;
        }

        const endPoint = extractTrendPoint(state) ?? current.end;
        if (
          !endPoint ||
          (endPoint.date === current.start.date && endPoint.value === current.start.value)
        ) {
          return null;
        }

        setTrendLines((previous) => [
          ...previous,
          {
            id: createTrendLineId(),
            start: current.start,
            end: endPoint,
          },
        ]);

        return null;
      });
    },
    [extractTrendPoint, isDrawMode],
  );

  const handleChartPointerLeave = useCallback(() => {
    if (!isDrawMode) {
      return;
    }

    setIsDrawing(false);
    setDraftLine(null);
  }, [isDrawMode]);

  const handleToggleDrawMode = useCallback(() => {
    setIsDrawMode((previous) => {
      const next = !previous;
      if (!next) {
        setDraftLine(null);
        setIsDrawing(false);
      }
      return next;
    });
  }, []);

  const handleClearTrendLines = useCallback(() => {
    setTrendLines([]);
    setDraftLine(null);
    setIsDrawing(false);
  }, []);

  return {
    canClearTrendLines: trendLines.length > 0,
    draftLine,
    drawButtonLabel: isDrawMode ? "Finish Drawing" : "Draw Trend",
    drawHint: isDrawMode
      ? "Click and release on two points to draw a line. Toggle off to exit drawing."
      : null,
    handleChartPointerDown,
    handleChartPointerLeave,
    handleChartPointerMove,
    handleChartPointerUp,
    handleClearTrendLines,
    handleToggleDrawMode,
    isDrawMode,
    trendLines,
  };
}
