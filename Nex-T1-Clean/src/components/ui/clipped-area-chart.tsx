"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis } from "recharts";
import { useMotionValueEvent, useSpring } from "motion/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { formatNumber } from "@/lib/utils/number";

type ClippedAreaChartPoint = {
  label: string;
  value: number;
};

type ClippedAreaChartProps = {
  points: ClippedAreaChartPoint[];
  headlineLabel: string;
  headlineValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  emptyLabel?: string;
  color?: string;
};

const DEFAULT_COLOR = "#38bdf8"; // sky-400

export function ClippedAreaChart({
  points,
  headlineLabel,
  headlineValue,
  secondaryLabel,
  secondaryValue,
  emptyLabel = "No data available",
  color = DEFAULT_COLOR,
}: ClippedAreaChartProps) {
  const uniqueId = useId().replace(/:/g, "");
  const chartRef = useRef<HTMLDivElement>(null);
  const [axis, setAxis] = useState(0);

  const areaGradientId = `gradient-clipped-area-invitations-${uniqueId}`;

  const springX = useSpring(0, { damping: 30, stiffness: 100 });
  const springY = useSpring(0, { damping: 30, stiffness: 100 });

  useMotionValueEvent(springX, "change", (latest) => {
    setAxis(latest);
  });

  const chartData = useMemo<ClippedAreaChartPoint[]>(() => {
    if (!points || points.length === 0) {
      return Array.from({ length: 12 }).map(() => ({
        label: "",
        value: 0,
      }));
    }
    return points;
  }, [points]);

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      invitations: {
        label: "Invitations",
        color,
      },
    }),
    [color],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardDescription>{headlineLabel}</CardDescription>
          <CardTitle className="text-3xl font-regular">{headlineValue}</CardTitle>
        </div>
        {secondaryLabel && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{secondaryLabel}</p>
            <p className="text-sm font-medium text-foreground">{secondaryValue}</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <ChartContainer ref={chartRef} className="h-56 w-full" config={chartConfig}>
            <AreaChart
              className="overflow-visible"
              data={chartData}
              onMouseMove={(state) => {
                const x = state.activeCoordinate?.x;
                const dataValue = state.activePayload?.[0]?.value;
                if (typeof x === "number" && typeof dataValue === "number") {
                  springX.set(x);
                  springY.set(dataValue);
                }
              }}
              onMouseLeave={() => {
                const width = chartRef.current?.getBoundingClientRect().width ?? 0;
                springX.set(width);
                springY.jump(lastValue);
              }}
              margin={{ right: 12, left: 12, bottom: 0, top: 8 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                horizontalCoordinatesGenerator={({ height }) => [0, height - 32]}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <Tooltip
                allowEscapeViewBox={{ x: true, y: true }}
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => (
                      <div className="flex w-full flex-col">
                        <span className="text-xs text-muted-foreground">Invitations</span>
                        <span className="font-regular text-foreground">{formatNumber(value as number)}</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill={`url(#${areaGradientId})`}
                fillOpacity={0.35}
                stroke="var(--color-invitations)"
                strokeWidth={2}
                clipPath={`inset(0 ${Math.max(
                  (chartRef.current?.getBoundingClientRect().width ?? 0) - axis,
                  0,
                )} 0 0)`}
              />
              <line
                x1={axis}
                y1={0}
                x2={axis}
                y2="85%"
                stroke="var(--color-invitations)"
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeOpacity={0.2}
              />
              <rect
                x={axis - 48}
                y={4}
                width={64}
                height={24}
                rx={6}
                ry={6}
                className="fill-background stroke-border/60"
                strokeWidth={1}
              />
              <text x={axis - 16} y={20} textAnchor="middle" fill="var(--color-invitations)" fontWeight={600}>
                {formatNumber(springY.get())}
              </text>
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-invitations)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-invitations)" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
