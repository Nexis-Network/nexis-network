import { Fragment, type JSX } from "react";
import { Area, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

import { ComparisonTooltipContent } from "./price-chart-panel-comparison-tooltip";
import {
  createActiveDot,
  createTerminalDot,
} from "./price-chart-panel-line-dots";
import type {
  CombinedPoint,
  ProcessedSeries,
} from "./price-chart-panel.types";
import { NEUTRAL_COLOR, POSITIVE_COLOR } from "./price-chart-panel.utils";

type PriceChartLineChartProps = {
  activePoint: CombinedPoint | null;
  activeTimestamp: number | null;
  areaBaseValue: number;
  chartConfig: ChartConfig;
  dailyHigh?: number | null;
  dailyLow?: number | null;
  glowId: string;
  livePingClass: string;
  mergedData: CombinedPoint[];
  onHoverClear: () => void;
  onTooltipMove: (payloadIndex?: number) => void;
  primarySeries: ProcessedSeries | null;
  processedSeries: ProcessedSeries[];
  tickFormatter: (value: number) => string;
  yDomain: [number, number];
};

export function PriceChartLineChart({
  activePoint,
  activeTimestamp,
  areaBaseValue,
  chartConfig,
  dailyHigh,
  dailyLow,
  glowId,
  livePingClass,
  mergedData,
  onHoverClear,
  onTooltipMove,
  primarySeries,
  processedSeries,
  tickFormatter,
  yDomain,
}: PriceChartLineChartProps): JSX.Element {
  return (
    <ChartContainer
      config={chartConfig}
      className="relative z-10 h-full w-full flex-1 !aspect-auto !items-stretch !justify-start !p-0 [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:!w-full [&_.recharts-wrapper]:!h-full [&_.recharts-wrapper]:!w-full"
    >
      <LineChart
        accessibilityLayer
        data={mergedData}
        margin={{ left: -4, right: -4, top: 18, bottom: 0 }}
        onMouseMove={(state) => onTooltipMove(state?.activeTooltipIndex)}
        onMouseLeave={onHoverClear}
      >
        <defs>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {processedSeries.map((entry) => (
            <linearGradient
              key={`${entry.gradientId}-defs`}
              id={entry.gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={entry.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={entry.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <YAxis type="number" domain={yDomain} hide />
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
        <ChartTooltip
          cursor={{
            stroke: primarySeries?.color ?? NEUTRAL_COLOR,
            strokeOpacity: 0.25,
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
          content={
            <ComparisonTooltipContent
              series={processedSeries}
              activeTimestamp={activeTimestamp}
              activePoint={activePoint}
              dailyHigh={primarySeries ? dailyHigh : null}
              dailyLow={primarySeries ? dailyLow : null}
            />
          }
        />
        {processedSeries.map((entry) => (
          <Fragment key={entry.dataKey}>
            {entry.isPrimary ? (
              <Area
                dataKey={entry.dataKey}
                type="linear"
                stroke="none"
                fill={`url(#${entry.gradientId})`}
                baseValue={areaBaseValue}
                connectNulls
                isAnimationActive
              />
            ) : null}
            <Line
              dataKey={entry.dataKey}
              type="linear"
              stroke={entry.color || POSITIVE_COLOR}
              dot={
                entry.isPrimary
                  ? createTerminalDot(entry.color || POSITIVE_COLOR, livePingClass, mergedData.length)
                  : false
              }
              strokeWidth={entry.isPrimary ? 2 : 2.2}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeMiterlimit={10}
              strokeOpacity={entry.isPrimary ? 1 : 0.95}
              connectNulls
              isAnimationActive={false}
              filter={entry.isPrimary ? `url(#${glowId})` : undefined}
              activeDot={createActiveDot(entry.color, livePingClass)}
            />
          </Fragment>
        ))}
      </LineChart>
    </ChartContainer>
  );
}
