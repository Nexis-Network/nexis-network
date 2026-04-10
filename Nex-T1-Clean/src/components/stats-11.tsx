"use client";

import Link from "next/link";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Stats11CardDetail = {
  label: string;
  value: string;
  toneClassName?: string;
};

export type Stats11Card = {
  id: string;
  title: string;
  value: string;
  limit?: string | null;
  percentage?: number | null;
  details?: Stats11CardDetail[];
  status?: string | null;
  warningMessage?: string | null;
  actionLabel?: string | null;
  actionHref?: string | null;
  actionIcon?: React.ReactNode;
  progressColorClassName?: string;
  statusClassName?: string;
  stackedProgress?: boolean;
};

type Stats11Props = {
  cards: Stats11Card[];
  className?: string;
};

function parseMetricValue(value: string) {
  const normalized = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(normalized) ? Math.max(normalized, 0) : 0;
}

function renderProgressBar(card: Stats11Card) {
  if (card.stackedProgress && card.details && card.details.length > 0) {
    const segments = card.details.slice(0, 3);
    const total = segments.reduce((sum, segment) => sum + parseMetricValue(segment.value), 0);

    return (
      <svg
        viewBox="0 0 100 6"
        className="h-1.5 w-full overflow-hidden rounded-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          width="100"
          height="6"
          rx="3"
          fill="currentColor"
          className="text-muted/60"
        />
        {segments.map((segment, index) => {
          const numeric = parseMetricValue(segment.value);
          const percentage = total > 0 ? (numeric / total) * 100 : 0;
          const offset = segments
            .slice(0, index)
            .reduce((sum, item) => sum + parseMetricValue(item.value), 0);
          const left = total > 0 ? (offset / total) * 100 : 0;

          return (
            <rect
              key={`${card.id}-${segment.label}`}
              x={left}
              y="0"
              width={percentage}
              height="6"
              rx="3"
              fill="currentColor"
              className={cn(
                "transition-[width] duration-200 ease-out",
                segment.toneClassName ?? "text-chart-1",
              )}
            />
          );
        })}
      </svg>
    );
  }

  if (typeof card.percentage !== "number" || !Number.isFinite(card.percentage)) {
    return <div className="h-1.5 w-full rounded-full bg-muted/60" />;
  }

  return (
    <svg
      viewBox="0 0 100 6"
      className="h-1.5 w-full overflow-hidden rounded-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        width="100"
        height="6"
        rx="3"
        fill="currentColor"
        className="text-muted/60"
      />
      <rect
        x="0"
        y="0"
        width={Math.max(0, Math.min(card.percentage, 100))}
        height="6"
        rx="3"
        fill="currentColor"
        className={cn(
          "transition-[width] duration-200 ease-out",
          card.progressColorClassName ?? "text-chart-1",
        )}
      />
    </svg>
  );
}

function MetricCard(card: Stats11Card) {
  const footer = card.actionLabel && card.actionHref ? (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-10 w-full justify-start rounded-none border-t border-border/70 px-4 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
    >
      <Link href={card.actionHref}>
        {card.actionIcon}
        <span className="text-xs">{card.actionLabel}</span>
      </Link>
    </Button>
  ) : null;

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-none">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex flex-1 flex-col px-4 py-4">
          <h3 className="text-xs font-medium text-muted-foreground">
            {card.title}
          </h3>

          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-2xl font-semibold leading-none tracking-tight text-foreground">
              {card.value}
            </div>
            {card.limit ? (
              <div className="text-xs leading-none text-muted-foreground">
                {card.limit}
              </div>
            ) : null}
          </div>

          <div className="mt-4">{renderProgressBar(card)}</div>

          {card.details?.length ? (
            <div className="mt-4 space-y-2">
              {card.details.map((detail) => (
                <div
                  key={`${card.id}-${detail.label}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 8 8"
                    className={cn("size-2 shrink-0", detail.toneClassName ?? "text-chart-1")}
                  >
                    <circle cx="4" cy="4" r="4" fill="currentColor" />
                  </svg>
                  <span>{detail.label}</span>
                  <span className="flex-1 border-b border-dotted border-border/80" />
                  <span className="font-medium tabular-nums text-foreground">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {card.status ? (
            <p
              className={cn(
                "mt-4 text-sm",
                card.statusClassName ?? "text-foreground",
              )}
            >
              {card.status}
            </p>
          ) : null}

          {card.warningMessage ? (
            <p className="mt-4 text-sm text-chart-5">{card.warningMessage}</p>
          ) : null}
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}

export function Stats11({ cards, className }: Stats11Props) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
      {cards.map((card) => (
        <MetricCard key={card.id} {...card} />
      ))}
    </div>
  );
}

export default Stats11;
