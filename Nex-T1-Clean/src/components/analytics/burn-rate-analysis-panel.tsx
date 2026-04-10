"use client";

import { ArrowUpRight, LineChart, Play, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBurnRateArtifact } from "@/hooks/ai";

interface BurnRateAnalysisPanelProps {
  onOpenChart: () => void;
}

function useBurnRateArtifactData() {
  const { data: payload } = useBurnRateArtifact();
  return {
    payload,
    data: payload,
    metadata: payload?.metadata,
    stage: payload?.stage ?? "idle",
    progress: payload?.progress ?? 0,
    metrics: payload?.metrics ?? [],
    insights: payload?.insights ?? [],
    panels: payload?.panels ?? [],
  };
}

export function BurnRateAnalysisPanel({ onOpenChart }: BurnRateAnalysisPanelProps) {
  const { data, metadata, stage, progress, metrics, insights, panels } = useBurnRateArtifactData();

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background/70 to-background/40 p-8 text-center">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No burn rate analysis yet</p>
          <p>Ask the assistant for a treasury or runway review to populate this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-3">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background via-background/80 to-background/40">
        <CardHeader className="flex flex-col gap-2 border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-regular text-foreground">
              <LineChart className="h-4 w-4 text-primary" />
              {metadata?.title ?? "Burn Rate Overview"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground/90">
              {metadata?.summary ?? "Streaming financial insights to monitor burn, runway, and spending efficiency."}
            </CardDescription>
          </div>
          <Button onClick={onOpenChart} size="sm" variant="secondary" className="gap-1.5">
            Open full chart
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5 px-5 py-4">
          {stage !== "complete" ? (
            <div className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {stage === "loading" && "Initializing artifact stream..."}
                  {stage === "streaming" && "Processing financial data..."}
                  {stage === "analyzing" && "Synthesizing insights..."}
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <Progress className="mt-3 h-1.5" value={progress * 100} />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            {metrics.map((metric) => {
              const trend =
                metric.trend === "up"
                  ? { icon: <TrendingUp className="h-3.5 w-3.5 text-destructive" />, tone: "text-destructive" }
                  : metric.trend === "down"
                  ? { icon: <TrendingDown className="h-3.5 w-3.5 text-green-500" />, tone: "text-green-500" }
                  : { icon: null, tone: "text-muted-foreground" };

              return (
                <div
                  className="rounded-xl border border-border/50 bg-background/70 p-4 transition hover:border-primary/50 hover:shadow"
                  key={metric.id}
                >
                  <div className="flex items-center justify-between text-xs font-regular text-muted-foreground/80">
                    <span>{metric.label}</span>
                    {trend.icon}
                  </div>
                  <p className="mt-2 text-xl font-regular text-foreground">{metric.formattedValue ?? metric.value}</p>
                  {typeof metric.deltaPercentage === "number" && (
                    <p className={`text-xs ${trend.tone}`}>
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

      {insights.length > 0 && (
        <Card className="flex-1 overflow-hidden border-border/60 bg-background/80">
          <CardHeader className="flex flex-col gap-2 border-b border-border/40 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-regular text-foreground">AI Insights</CardTitle>
              <CardDescription className="text-sm text-muted-foreground/90">
                Model generated highlights from the latest burn rate stream.
              </CardDescription>
            </div>
            <Badge variant="secondary">{insights.length} insight{insights.length === 1 ? "" : "s"}</Badge>
          </CardHeader>
          <CardContent className="h-full space-y-3 overflow-auto px-5 py-4">
            {insights.map((insight) => (
              <div
                className="rounded-xl border border-border/50 bg-background/90 p-4 text-sm transition hover:border-primary/40 hover:shadow-sm"
                key={insight.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{insight.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] uppercase">
                    {insight.severity}
                  </Badge>
                </div>
                {insight.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {insight.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {panels.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {panels.map((panel) => (
            <Card key={panel.id} className="border-border/60 bg-background/80">
              <CardHeader className="space-y-2 px-5 py-4">
                <CardTitle className="flex items-center justify-between text-sm font-regular text-foreground">
                  {panel.title}
                  {panel.metrics?.length ? (
                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                      {panel.metrics.length}
                    </Badge>
                  ) : null}
                </CardTitle>
                {panel.description ? (
                  <CardDescription className="text-xs text-muted-foreground/90">{panel.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4 px-5 py-4 text-sm">
                {panel.body ? <p className="text-muted-foreground/80">{panel.body}</p> : null}
                {panel.metrics?.length ? (
                  <div className="grid gap-2">
                    {panel.metrics.map((metric) => (
                      <div className="rounded-lg border border-border/50 bg-background/70 p-3" key={metric.id}>
                        <p className="text-xs font-medium text-muted-foreground/90">{metric.label}</p>
                        <p className="text-base font-regular text-foreground">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {panel.insights?.length ? (
                  <div className="space-y-2 text-xs text-muted-foreground/90">
                    {panel.insights.map((insight) => (
                      <div className="rounded-lg border border-border/50 bg-background/60 p-3" key={insight.id}>
                        {insight.title}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-background/70 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Play className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground/90">
            Artifact is {stage === "complete" ? "ready" : "still streaming"}.
          </span>
        </div>
      </div>
    </div>
  );
}
