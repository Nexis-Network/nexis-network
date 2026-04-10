"use client";

import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useBurnRateArtifact } from "@/hooks/ai";

type BurnRateChartProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NormalisedPoint = {
  x: string | number;
  label: string;
  [seriesId: string]: string | number;
};

function useBurnRateArtifactData() {
  const { data: payload } = useBurnRateArtifact();
  return {
    payload,
    data: payload,
    metadata: payload?.metadata,
    stage: payload?.stage ?? "idle",
    progress: payload?.progress ?? 0,
    datasets: payload?.datasets ?? [],
    controls: payload?.controls ?? { filters: [], actions: [] },
    metrics: payload?.metrics ?? [],
    insights: payload?.insights ?? [],
    panels: payload?.panels ?? [],
    streamSummary: payload?.streamSummary ?? { eventsProcessed: 0 },
  };
}

function combineDatasets(datasets: ReturnType<typeof useBurnRateArtifactData>["datasets"]): NormalisedPoint[] {
  const map = new Map<string | number, NormalisedPoint>();

  datasets.forEach((dataset) => {
    dataset.values.forEach((value) => {
      const key = value.x;
      const cached =
        map.get(key) ??
        ({
          x: value.x,
          label: typeof value.x === "string" ? value.x : value.x.toString(),
        } as NormalisedPoint);

      cached[dataset.id] = value.y;
      map.set(key, cached);
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (typeof a.x === "number" && typeof b.x === "number") {
      return a.x - b.x;
    }
    return String(a.x).localeCompare(String(b.x));
  });
}

function formatTrend(trend?: "up" | "down" | "flat") {
  if (trend === "up") {
    return { icon: <TrendingUp className="h-3.5 w-3.5 text-destructive" />, label: "Trending up" };
  }
  if (trend === "down") {
    return { icon: <TrendingDown className="h-3.5 w-3.5 text-green-500" />, label: "Trending down" };
  }
  return { icon: null, label: "Stable" };
}

export function BurnRateChart({ isOpen, onClose }: BurnRateChartProps) {
  const { data, metadata, stage, progress, datasets, controls, metrics, insights, panels, streamSummary } =
    useBurnRateArtifactData();
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => combineDatasets(datasets), [datasets]);
  const lineSeries = datasets.filter((dataset) => dataset.type === "line");
  const areaSeries = datasets.filter((dataset) => dataset.type === "area");

  if (!isOpen) {
    return null;
  }

  const togglePanel = (panelId: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  const title = metadata?.title ?? "Burn Rate Analysis";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="space-y-1">
            <h2 className="font-regular text-lg md:text-xl">{title}</h2>
            <p className="text-muted-foreground text-sm">
              {metadata?.summary ?? "Streaming burn, runway, and spend efficiency with live AI insights."}
            </p>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {stage !== "complete" && (
          <div className="border-b border-border bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {stage === "loading" && "Initializing artifact stream..."}
                {stage === "streaming" && "Processing financial inputs..."}
                {stage === "analyzing" && "Synthesizing insights..."}
              </span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <Progress className="mt-2 h-1.5" value={progress * 100} />
          </div>
        )}

        <div className="grid flex-1 gap-4 overflow-hidden p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <Card className="h-full">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Revenue vs Expenses</CardTitle>
                  <CardDescription>Timeframe: {data?.timeframe ?? "N/A"}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {controls.filters?.map((filter) => (
                    <Badge key={filter.id} variant="outline">
                      {filter.label}: {String(filter.value ?? "—")}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <ComposedBurnChart areaSeries={areaSeries} chartData={chartData} lineSeries={lineSeries} />
                  </ResponsiveContainer>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-3">
                  {metrics.map((metric) => {
                    const trend = formatTrend(metric.trend);
                    return (
                      <div className="rounded-lg border border-border bg-muted/40 p-3" key={metric.id}>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{metric.label}</span>
                          {trend.icon}
                        </div>
                        <p className="mt-2 font-regular text-lg">{metric.formattedValue ?? metric.value}</p>
                        {typeof metric.deltaPercentage === "number" && (
                          <p
                            className={`text-xs ${
                              metric.deltaPercentage > 0
                                ? "text-green-500"
                                : metric.deltaPercentage < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {metric.deltaPercentage > 0 ? "+" : ""}
                            {metric.deltaPercentage.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-[220px] flex-1 overflow-hidden">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-medium">AI Insights</CardTitle>
                  <CardDescription>Newest findings streamed from the burn rate analysis.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-full overflow-auto">
                {insights.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Waiting for the model to stream insights...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight) => (
                      <div
                        className="rounded-lg border border-border bg-background/80 p-3 transition hover:border-primary/40"
                        key={insight.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{insight.title}</p>
                            <p className="mt-1 text-muted-foreground text-xs">{insight.description}</p>
                          </div>
                          <Badge variant="secondary">{insight.severity}</Badge>
                        </div>
                        {insight.tags?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {insight.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            {panels.length === 0 ? (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-base font-medium">Artifact Panels</CardTitle>
                  <CardDescription>Panels will populate as the artifact streams new sections.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              panels.map((panel) => {
                const isExpanded = expandedPanels.has(panel.id) || panel.expanded;
                return (
                  <Card className="overflow-hidden" key={panel.id}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => togglePanel(panel.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-medium">{panel.title}</CardTitle>
                          {panel.description && <CardDescription>{panel.description}</CardDescription>}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="space-y-4">
                        {panel.metrics?.length ? (
                          <div className="grid gap-3">
                            {panel.metrics.map((metric) => (
                              <div key={metric.id} className="rounded-md border border-border/50 bg-muted/30 p-2">
                                <p className="text-muted-foreground text-xs">{metric.label}</p>
                                <p className="font-regular text-sm">{metric.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {panel.insights?.length ? (
                          <div className="space-y-2">
                            {panel.insights.map((insight) => (
                              <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground" key={insight.id}>
                                {insight.title}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {panel.body ? <p className="text-sm text-muted-foreground">{panel.body}</p> : null}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}

            <Card className="mt-auto">
              <CardHeader>
                <CardTitle className="text-base font-medium">Stream Diagnostics</CardTitle>
                <CardDescription>Monitor how many streaming events have been applied.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Events processed</span>
                  <span className="font-medium">{streamSummary.eventsProcessed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={stage === "complete" ? "default" : "secondary"}>
                    {stage === "complete" ? "Complete" : "Streaming"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

type ComposedBurnChartProps = {
  chartData: NormalisedPoint[];
  lineSeries: ReturnType<typeof useBurnRateArtifactData>["datasets"];
  areaSeries: ReturnType<typeof useBurnRateArtifactData>["datasets"];
};

function ComposedBurnChart({ chartData, lineSeries, areaSeries }: ComposedBurnChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Waiting for chart data...
      </div>
    );
  }

  const fallbackColor = areaSeries[0]?.color ?? "hsl(var(--chart-1))";

  return (
    <ResponsiveContainer>
      <AreaChart data={chartData}>
        <CartesianGrid stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} />
        <YAxis tickLine={false} axisLine={false} tickMargin={16} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
          }}
        />
        {areaSeries.map((series) => (
          <Area
            key={series.id}
            type="monotone"
            dataKey={series.id}
            stroke={series.color ?? fallbackColor}
            fill={series.color ?? fallbackColor}
            fillOpacity={0.18}
            strokeWidth={2}
            activeDot={{ r: 4 }}
          />
        ))}
        {lineSeries.map((series) => (
          <Line
            key={series.id}
            type="monotone"
            dataKey={series.id}
            stroke={series.color ?? "hsl(var(--chart-3))"}
            strokeWidth={series.strokeWidth ?? 2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
