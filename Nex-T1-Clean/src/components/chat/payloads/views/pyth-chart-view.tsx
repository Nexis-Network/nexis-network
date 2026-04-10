"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PythChart } from "@/components/dashboard/lazy-components";
import type {
  PythChartPayload,
  PythChartPayloadViewProps,
} from "@/components/chat/types";

const ChartSkeleton = () => (
  <div className="mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-3">
    <div className="space-y-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <div className="rounded-lg border border-border/40 bg-background/70 p-2">
      <Skeleton className="h-[320px] w-full md:h-[380px]" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

const normalizeTickerKey = (value: string | null | undefined) =>
  (value ?? "").replace(/[\s/:\-]+/g, "").toUpperCase();

export function PythChartPayloadView({
  payloads,
  requestedTickers,
}: PythChartPayloadViewProps) {
  const chartPayloads = useMemo(() => {
    const filtered: PythChartPayload[] = [];
    for (const payload of payloads) {
      if (payload.type === "pyth-chart") {
        filtered.push(payload);
      }
    }
    return filtered;
  }, [payloads]);

  const orderedPayloads = useMemo(() => {
    if (!chartPayloads.length) {
      return [] as PythChartPayload[];
    }

    const deduped = new Map<string, PythChartPayload>();
    for (const item of chartPayloads) {
      const key = normalizeTickerKey(item.snapshot?.ticker ?? item.ticker);
      if (key && !deduped.has(key)) {
        deduped.set(key, item);
      } else if (!key) {
        deduped.set(`fallback-${deduped.size}`, item);
      }
    }

    const ordered: PythChartPayload[] = [];
    for (const ticker of requestedTickers) {
      const key = normalizeTickerKey(ticker);
      const match = deduped.get(key);
      if (match) {
        ordered.push(match);
        deduped.delete(key);
      }
    }

    deduped.forEach((value) => ordered.push(value));
    return ordered;
  }, [chartPayloads, requestedTickers]);

  const [activeIndex, setActiveIndex] = useState(0);
  const payloadSignature = useMemo(
    () =>
      orderedPayloads
        .map((item) => normalizeTickerKey(item.snapshot?.ticker ?? item.ticker))
        .join("|"),
    [orderedPayloads],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [payloadSignature]);

  if (orderedPayloads.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeIndex, orderedPayloads.length - 1);
  const activePayload = orderedPayloads[safeIndex];
  const { snapshot, error, news, ticker: payloadTicker } = activePayload;
  
  // Use snapshot ticker or fallback to payload ticker
  const effectiveTicker = snapshot?.ticker ?? payloadTicker;
  const overviewName = snapshot?.assetName ?? null;
  const overviewSymbol = snapshot?.assetSymbol ?? null;
  const overviewLogo = snapshot?.assetImageUrl ?? null;
  const overviewSummary = snapshot?.assetSummary ?? null;
  const overviewMarketCap = snapshot?.marketCapUsd ?? null;
  const overviewVolume = snapshot?.volume24hUsd ?? null;

  const formatCompactUsd = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) {
      return "—";
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  };
  
  const chartContent = effectiveTicker ? (
    <PythChart
      ticker={effectiveTicker}
      priceFeedId={snapshot?.priceFeedId}
      lookbackDays={snapshot?.lookbackDays ?? 7}
      resolutionMinutes={snapshot?.resolutionMinutes ?? 15}
    />
  ) : error ? (
    <div className="rounded-xl border border-border/40 bg-background/80 p-4 text-sm text-destructive">
      {error}
    </div>
  ) : (
    <ChartSkeleton />
  );

  const hasMultiple = orderedPayloads.length > 1;
  const activeTicker = snapshot?.ticker ?? activePayload.ticker;
  const hasOverview = Boolean(
    overviewName ||
      overviewSymbol ||
      overviewSummary ||
      overviewLogo ||
      overviewMarketCap != null ||
      overviewVolume != null,
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        {chartContent}
        {hasMultiple ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="absolute bottom-3 left-3 h-8 rounded-full border border-border/60 bg-background/60 px-3 text-xs shadow-sm backdrop-blur transition hover:border-border hover:bg-background/80"
              aria-label="Show previous token chart"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + orderedPayloads.length) % orderedPayloads.length)
              }
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Prev
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="absolute bottom-3 right-3 h-8 rounded-full border border-border/60 bg-background/60 px-3 text-xs shadow-sm backdrop-blur transition hover:border-border hover:bg-background/80"
              aria-label="Show next token chart"
              onClick={() => setActiveIndex((prev) => (prev + 1) % orderedPayloads.length)}
            >
              Next
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              {activeTicker} ({safeIndex + 1}/{orderedPayloads.length})
            </span>
          </>
        ) : null}
      </div>
      {error && snapshot ? <p className="text-xs text-destructive">{error}</p> : null}
      {hasOverview ? (
        <div className="space-y-3 rounded-xl border border-border/30 bg-background/40 p-4 backdrop-blur-md transition-all hover:bg-background/50 hover:border-border/50">
          <div className="flex items-center gap-4">
            {overviewLogo ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20" />
                <Image
                  src={overviewLogo}
                  alt={overviewName ?? overviewSymbol ?? activeTicker ?? "Token Logo"}
                  className="relative h-10 w-10 rounded-full border border-border/40 bg-background/50 object-contain"
                  width={40}
                  height={40}
                  unoptimized
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-base font-bold text-foreground">
                  {overviewName ?? activeTicker}
                </p>
                {overviewSymbol && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {overviewSymbol.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground/80">
                Live Market Analytics
              </p>
            </div>
          </div>
          {overviewSummary ? (
            <p className="text-sm leading-relaxed text-muted-foreground/90 font-medium">
              {overviewSummary}
            </p>
          ) : null}
          {(overviewMarketCap != null || overviewVolume != null) ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/20 pt-3 text-xs font-semibold text-muted-foreground">
              {overviewMarketCap != null ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Market Cap</span>
                  <span className="text-foreground">{formatCompactUsd(overviewMarketCap)}</span>
                </div>
              ) : null}
              {overviewVolume != null ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">24h Volume</span>
                  <span className="text-foreground">{formatCompactUsd(overviewVolume)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {news && news.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border/40 bg-background/60 p-4">
          <span className="text-xs font-regular uppercase tracking-wide text-muted-foreground">
            Latest Headlines
          </span>
          <div className="space-y-3">
            {news.slice(0, 4).map((headline, idx) => (
              <a
                key={`${headline.url}-${idx}`}
                className="group block rounded-lg border border-transparent p-2 transition-colors hover:border-border/70 hover:bg-muted/20"
                href={headline.url}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium leading-snug group-hover:text-primary">
                    {headline.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {(headline.source ?? "News").trim()}
                    {" • "}
                    {new Date(headline.publishedAt).toLocaleString()}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
