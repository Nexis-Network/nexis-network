"use client";

import { ComponentPropsWithoutRef } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export const DEFAULT_GLOW_FILTER_ID = "rainbow-line-glow";
export const DEFAULT_GLOW_STROKE = "#38bdf8"; // tailwind sky-400

type GlowingLineDefsProps = {
  id?: string;
};

export function GlowingLineDefs({ id = DEFAULT_GLOW_FILTER_ID }: GlowingLineDefsProps) {
  return (
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

type GlowingLineProps = ComponentPropsWithoutRef<typeof Line> & {
  filterId?: string;
};

export function GlowingLine({
  filterId = DEFAULT_GLOW_FILTER_ID,
  stroke = DEFAULT_GLOW_STROKE,
  strokeWidth = 2.5,
  dot = false,
  type = "monotone",
  ...rest
}: GlowingLineProps) {
  return (
    <Line
      {...rest}
      type={type}
      stroke={stroke}
      strokeWidth={strokeWidth}
      dot={dot}
      filter={`url(#${filterId})`}
    />
  );
}

const chartData = [
  { month: "January", desktop: 186, mobile: 87 },
  { month: "February", desktop: 305, mobile: 163 },
  { month: "March", desktop: 237, mobile: 142 },
  { month: "April", desktop: 73, mobile: 195 },
  { month: "May", desktop: 209, mobile: 118 },
  { month: "June", desktop: 214, mobile: 231 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-2)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function GlowingLineChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Glowing Line Chart
          <Badge
            variant="outline"
            className="text-green-500 bg-green-500/10 border-none ml-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>5.2%</span>
          </Badge>
        </CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <GlowingLineDefs />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <GlowingLine
              dataKey="desktop"
              type="bump"
              stroke="var(--chart-2)"
              strokeWidth={2}
            />
            <GlowingLine
              dataKey="mobile"
              type="bump"
              stroke="var(--chart-5)"
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
