"use client";

import React, { useState } from "react";
import { useSwapStore } from "@/stores/use-swap-store";
import { cn } from "@/lib/utils";
import { ChartPriceLine } from "./chart-price-line";
import { useChartData, type ChartRange } from "./use-chart-data";
import { useMarketStream } from "@/hooks/use-market-stream";

interface MarketOverviewChartProps {
  className?: string;
}

export function MarketOverviewChart({ className }: MarketOverviewChartProps) {
  const sellToken = useSwapStore((s) => s.sellToken);
  const [range] = useState<ChartRange>("1D");
  const symbol = sellToken?.symbol || "ETH"; // Default for visual testing

  const { points, isLoading, error } = useChartData(symbol, range);

  // Hook into live streaming websocket
  const { data: streamData } = useMarketStream([symbol.toLowerCase()]);
  const livePrice = streamData[symbol.toLowerCase()]?.price;

  // Append or override the last point with live price
  const chartPoints = [...points];
  if (chartPoints.length > 0 && livePrice) {
    const lastIdx = chartPoints.length - 1;
    chartPoints[lastIdx] = {
      ...chartPoints[lastIdx],
      close: livePrice,
      high: Math.max(chartPoints[lastIdx].high, livePrice),
      low: Math.min(chartPoints[lastIdx].low, livePrice),
    };
  }

  return (
    <div className={cn("flex flex-col items-start w-full h-full", className)}>
      {/* Chart area — takes full space as header is extracted */}
      <div className="flex-1 w-full h-[400px]">
        <ChartPriceLine
          data={chartPoints}
          isLoading={isLoading}
          error={error}
          className="h-[400px] w-full"
        />
      </div>
    </div>
  );
}
