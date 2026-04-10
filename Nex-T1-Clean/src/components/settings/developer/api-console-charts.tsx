"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type {
  ApiConsoleActivityPoint,
  ApiConsoleProductBreakdown,
  ApiConsoleToolBreakdown,
} from "@/components/settings/developer/api-console-analytics";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const activityChartConfig = {
  spendUsd: {
    label: "Spend",
    color: "#3B82F6",
  },
  billedCredits: {
    label: "Credits",
    color: "#F59E0B",
  },
} satisfies ChartConfig;

const productChartConfig = {
  requests: {
    label: "Requests",
    color: "#2563EB",
  },
  billedCredits: {
    label: "Credits",
    color: "#D97706",
  },
} satisfies ChartConfig;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 3,
  }).format(value);
}

type ApiConsoleChartsProps = {
  activityData: ApiConsoleActivityPoint[];
  productData: ApiConsoleProductBreakdown[];
  toolData: ApiConsoleToolBreakdown[];
};

export function ApiConsoleCharts({
  activityData,
  productData,
  toolData,
}: ApiConsoleChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(0,0.95fr)]">
      <BentoCard>
        <BentoCardHeader title="Spend & credit velocity" />
        {activityData.length === 0 ? (
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Run a few requests to populate recent spend analytics.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--settings-foreground-muted)]">
              Recent request-log activity, grouped by day.
            </p>
            <ChartContainer
              config={activityChartConfig}
              className="h-[280px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[var(--settings-foreground-muted)]"
            >
              <AreaChart data={activityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-[140px] items-center justify-between gap-3">
                          <span>{String(name)}</span>
                          <span className="font-mono">
                            {name === "Spend" ? formatUsd(Number(value)) : value}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="spendUsd"
                  fill="var(--color-spendUsd)"
                  fillOpacity={0.18}
                  stroke="var(--color-spendUsd)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="billedCredits"
                  fill="var(--color-billedCredits)"
                  fillOpacity={0.1}
                  stroke="var(--color-billedCredits)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </BentoCard>

      <div className="space-y-6">
        <BentoCard>
          <BentoCardHeader title="Product mix" />
          {productData.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">
              Product distribution appears after the first successful request.
            </p>
          ) : (
            <ChartContainer
              config={productChartConfig}
              className="h-[240px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[var(--settings-foreground-muted)]"
            >
              <BarChart data={productData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="product"
                  type="category"
                  width={84}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="requests" fill="var(--color-requests)" radius={6} />
              </BarChart>
            </ChartContainer>
          )}
        </BentoCard>

        <BentoCard>
          <BentoCardHeader title="Top tools" />
          {toolData.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">
              Tool usage will show up here once requests invoke the public tool catalog.
            </p>
          ) : (
            <div className="space-y-3">
              {toolData.slice(0, 6).map((tool) => (
                <div
                  key={tool.toolName}
                  className="flex items-center justify-between rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 px-3 py-2"
                >
                  <span className="truncate text-sm text-[var(--settings-foreground-strong)]">
                    {tool.toolName}
                  </span>
                  <span className="font-mono text-xs text-[var(--settings-foreground-muted)]">
                    {tool.calls} calls
                  </span>
                </div>
              ))}
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
