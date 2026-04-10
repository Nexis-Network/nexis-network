import type { CSSProperties, JSX, WheelEventHandler } from "react";
import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatUsd } from "@/modules/prices/pyth/base";

import { PYTH_CHART_CONFIG } from "./pyth-chart.constants";
import { TrendLinesOverlay } from "./pyth-chart-overlays";
import type {
  ChartPoint,
  ChartPointerState,
  TrendLineShape,
} from "./pyth-chart.types";

type PythChartSurfaceProps = {
  chartData: ChartPoint[];
  draftLine: TrendLineShape | null;
  emaGlowId: string;
  handleChartPointerDown: (state?: ChartPointerState) => void;
  handleChartPointerLeave: () => void;
  handleChartPointerMove: (state?: ChartPointerState) => void;
  handleChartPointerUp: (state?: ChartPointerState) => void;
  handleWheel: WheelEventHandler<HTMLDivElement>;
  isDrawMode: boolean;
  lineStyles: CSSProperties;
  priceGlowId: string;
  trendLines: TrendLineShape[];
  yAxisDomain: [number, number] | null;
};

export function PythChartSurface({
  chartData,
  draftLine,
  emaGlowId,
  handleChartPointerDown,
  handleChartPointerLeave,
  handleChartPointerMove,
  handleChartPointerUp,
  handleWheel,
  isDrawMode,
  lineStyles,
  priceGlowId,
  trendLines,
  yAxisDomain,
}: PythChartSurfaceProps): JSX.Element {
  return (
    <div className="rounded-lg border border-border/40 bg-background/70 p-2">
      <div className="h-[320px] md:h-[380px]" onWheel={handleWheel}>
        <ChartContainer
          config={PYTH_CHART_CONFIG}
          className="h-full w-full px-2"
          style={lineStyles}
        >
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
            onMouseDown={handleChartPointerDown}
            onMouseMove={handleChartPointerMove}
            onMouseUp={handleChartPointerUp}
            onMouseLeave={handleChartPointerLeave}
            style={{ cursor: isDrawMode ? "crosshair" : "default" }}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              }
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              style={{ fontSize: "11px", userSelect: "none" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => formatUsd(value, value > 5_000 ? 0 : 2)}
              style={{ fontSize: "11px", userSelect: "none" }}
              domain={yAxisDomain ?? undefined}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  labelFormatter={(value) =>
                    new Date(value).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="linear"
              dataKey="close"
              stroke={`var(--color-close, ${PYTH_CHART_CONFIG.close.color ?? "hsl(var(--chart-2))"})`}
              strokeWidth={2.5}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              dot={false}
              activeDot={{ r: 3 }}
              filter={`url(#${priceGlowId})`}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="ema"
              stroke={`var(--color-ema, ${PYTH_CHART_CONFIG.ema.color ?? "hsl(var(--chart-5))"})`}
              strokeWidth={2}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeDasharray="6 6"
              dot={false}
              filter={`url(#${emaGlowId})`}
              isAnimationActive={false}
            />
            <Customized
              component={TrendLinesOverlay}
              trendLines={trendLines}
              draftLine={isDrawMode ? draftLine : null}
            />
            <defs>
              <filter id={priceGlowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="10" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
              <filter id={emaGlowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
