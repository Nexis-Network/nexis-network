import type { JSX } from "react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/modules/prices/market-overview/formatters";

import type {
  CombinedPoint,
  ProcessedSeries,
  TooltipPayloadItem,
} from "./price-chart-panel.types";
import {
  formatDeltaPercent,
  getNearestValueForTimestamp,
} from "./price-chart-panel.utils";

type ComparisonTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  series: ProcessedSeries[];
  activeTimestamp?: number | null;
  activePoint?: CombinedPoint | null;
  dailyHigh?: number | null;
  dailyLow?: number | null;
};

export function ComparisonTooltipContent({
  active,
  payload,
  series,
  activeTimestamp,
  activePoint,
  dailyHigh,
  dailyLow,
}: ComparisonTooltipContentProps): JSX.Element | null {
  if (!active || (!payload?.length && !activePoint)) {
    return null;
  }

  const payloadRow =
    (payload?.[0]?.payload as CombinedPoint | undefined) ?? activePoint ?? null;
  const resolvedTimestamp = activeTimestamp ?? payloadRow?.timestamp ?? null;

  return (
    <div className="min-w-[240px] rounded-xl border border-border bg-popover backbackdrop-blur-lg/95 p-4 text-popover-foreground shadow-lg">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="text-sm text-foreground">{payloadRow?.label ?? "—"}</span>
        {dailyHigh != null || dailyLow != null ? (
          <>
            <span>High: {formatCurrency(dailyHigh ?? null, { currency: "USD" })}</span>
            <span>Low: {formatCurrency(dailyLow ?? null, { currency: "USD" })}</span>
          </>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {series.map((entry) => {
          const datum = payload?.find((item) => item.dataKey === entry.dataKey);
          const value = getNearestValueForTimestamp(
            entry,
            resolvedTimestamp,
            datum?.value,
          );
          const basePrice = entry.sanitized[0]?.price ?? null;
          const deltaPercent =
            value != null && basePrice != null && basePrice !== 0
              ? ((value - basePrice) / basePrice) * 100
              : null;

          return (
            <div key={entry.dataKey} className="flex items-center gap-3 text-sm">
              <TooltipAssetAvatar
                src={entry.logoUrl}
                symbol={entry.symbol}
                color={entry.color}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.name}
                </p>
                <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">
                  {entry.symbol.toUpperCase()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 text-right">
                <span className="text-sm text-foreground">
                  {formatCurrency(value, { currency: "USD" })}
                </span>
                {deltaPercent != null ? (
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      deltaPercent >= 0 ? "text-[#38BDF8]" : "text-[#FF5459]",
                    )}
                  >
                    {formatDeltaPercent(deltaPercent)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TooltipAssetAvatar({
  src,
  symbol,
  color,
}: {
  src?: string | null;
  symbol: string;
  color: string;
}): JSX.Element {
  if (src) {
    return (
      <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={symbol}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background"
          style={{ backgroundColor: color }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-[11px] font-medium text-muted-foreground">
      {symbol.slice(0, 3)}
    </div>
  );
}
