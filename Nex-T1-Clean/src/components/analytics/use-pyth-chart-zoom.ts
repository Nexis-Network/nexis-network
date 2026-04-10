import { useCallback, useEffect, useState, type WheelEvent } from "react";

import {
  DEFAULT_VISIBLE_POINTS,
  MIN_VISIBLE_POINTS,
} from "./pyth-chart.constants";
import { clampVisiblePoints } from "./pyth-chart-data";

type UsePythChartZoomResult = {
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
  resetVisiblePoints: () => void;
  visiblePoints: number;
};

export function usePythChartZoom(chartPointCount: number): UsePythChartZoomResult {
  const [visiblePoints, setVisiblePoints] = useState(DEFAULT_VISIBLE_POINTS);

  useEffect(() => {
    if (chartPointCount === 0) {
      return;
    }

    setVisiblePoints((current) => clampVisiblePoints(current, chartPointCount));
  }, [chartPointCount]);

  const resetVisiblePoints = useCallback(() => {
    setVisiblePoints(DEFAULT_VISIBLE_POINTS);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!chartPointCount || (!event.ctrlKey && !event.metaKey)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (chartPointCount <= MIN_VISIBLE_POINTS) {
        setVisiblePoints(chartPointCount);
        return;
      }

      const direction = Math.sign(event.deltaY);
      const step = Math.max(4, Math.round(chartPointCount * 0.05));

      setVisiblePoints((current) => {
        const next = direction > 0 ? current + step : current - step;
        return Math.max(MIN_VISIBLE_POINTS, Math.min(chartPointCount, next));
      });
    },
    [chartPointCount],
  );

  return {
    handleWheel,
    resetVisiblePoints,
    visiblePoints,
  };
}
