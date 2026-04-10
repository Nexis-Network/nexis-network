import type { JSX } from "react";
import { Bar, ComposedChart, XAxis, YAxis, type BarProps } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

import { CandleTooltipContent } from "./price-chart-panel-candle-tooltip";
import type { CandleBarProps, CandleDatum } from "./price-chart-panel.types";
import {
  NEGATIVE_COLOR,
  NEUTRAL_COLOR,
  POSITIVE_COLOR,
} from "./price-chart-panel.utils";

type PriceChartCandleChartProps = {
  candleChartConfig: ChartConfig;
  candleData: CandleDatum[];
  candleDomain: [number, number];
  normalizedVsCurrency: string;
  onHoverClear: () => void;
  onTooltipMove: (payloadIndex?: number) => void;
  tickFormatter: (value: number) => string;
};

export function PriceChartCandleChart({
  candleChartConfig,
  candleData,
  candleDomain,
  normalizedVsCurrency,
  onHoverClear,
  onTooltipMove,
  tickFormatter,
}: PriceChartCandleChartProps): JSX.Element {
  return (
    <ChartContainer
      config={candleChartConfig}
      className="relative z-10 h-full w-full flex-1 !aspect-auto !items-stretch !justify-start !p-0 [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:!w-full [&_.recharts-wrapper]:!h-full [&_.recharts-wrapper]:!w-full"
    >
      <ComposedChart
        data={candleData}
        margin={{ left: -4, right: -4, top: 18, bottom: 0 }}
        onMouseMove={(state) => onTooltipMove(state?.activeTooltipIndex)}
        onMouseLeave={onHoverClear}
      >
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          padding={{ left: 0, right: 0 }}
          allowDuplicatedCategory={false}
          stroke="rgba(232,232,227,0.25)"
          axisLine={{ stroke: "rgba(232,232,227,0.15)" }}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickFormatter={tickFormatter}
          dy={6}
        />
        <YAxis type="number" domain={candleDomain} hide />
        <ChartTooltip
          cursor={{
            stroke: "rgba(232,232,227,0.35)",
            strokeOpacity: 0.8,
            strokeWidth: 1,
            strokeDasharray: "3 3",
          }}
          content={<CandleTooltipContent vsCurrency={normalizedVsCurrency} />}
        />
        <Bar
          dataKey="close"
          isAnimationActive={false}
          barSize={12}
          radius={[2, 2, 2, 2]}
          fill="transparent"
          shape={(props: unknown) => <CandleBar {...(props as BarProps)} />}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function CandleBar({
  x = 0,
  width = 0,
  yAxis,
  payload,
}: CandleBarProps): JSX.Element | null {
  if (!payload || !yAxis?.scale) {
    return null;
  }

  const scale = yAxis.scale as (value: number) => number;
  const highY = scale(payload.high);
  const lowY = scale(payload.low);
  const openY = scale(payload.open);
  const closeY = scale(payload.close);

  if (![highY, lowY, openY, closeY].every((value) => Number.isFinite(value))) {
    return null;
  }

  const centerX = Number(x) + Number(width) / 2;
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyWidth = Math.min(Math.max(Number(width) * 0.6, 6), 14);
  const color =
    payload.direction === "down"
      ? NEGATIVE_COLOR
      : payload.direction === "up"
        ? POSITIVE_COLOR
        : NEUTRAL_COLOR;

  return (
    <g pointerEvents="none" aria-label={`candle-${payload.timestamp}`}>
      <line
        x1={centerX}
        x2={centerX}
        y1={highY}
        y2={lowY}
        stroke={color}
        strokeWidth={1.1}
        strokeOpacity={0.75}
        shapeRendering="crispEdges"
      />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={Math.max(2, bodyBottom - bodyTop)}
        rx={2}
        fill={color}
        fillOpacity={0.9}
        stroke={color}
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
    </g>
  );
}
