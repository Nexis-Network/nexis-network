import type { JSX } from "react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/modules/prices/market-overview/formatters";

import type { CandleDatum, TooltipPayloadItem } from "./price-chart-panel.types";
import { formatDeltaPercent } from "./price-chart-panel.utils";

type CandleTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  vsCurrency: string;
};

export function CandleTooltipContent({
  active,
  payload,
  vsCurrency,
}: CandleTooltipContentProps): JSX.Element | null {
  if (!active || !payload?.length) {
    return null;
  }

  const candle = payload[0]?.payload as CandleDatum | undefined;
  if (!candle) {
    return null;
  }

  const changeClass =
    candle.direction === "down"
      ? "text-[#FF5459]"
      : candle.direction === "up"
        ? "text-[#38BDF8]"
        : "text-muted-foreground";
  const currency = vsCurrency?.toUpperCase?.() ?? "USD";

  return (
    <div className="min-w-[220px] rounded-xl border border-border bg-popover backbackdrop-blur-lg/95 p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="text-sm text-foreground">{candle.label}</span>
          <span className={cn("text-xs font-medium", changeClass)}>
            {formatDeltaPercent(candle.changePercent)}
          </span>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="text-sm text-foreground">
            {formatCurrency(candle.close, { currency })}
          </span>
          <span className="text-[11px]">
            {formatCurrency(candle.change, {
              currency,
              signDisplay: "always",
            })}
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <TooltipMetric label="Open" value={formatCurrency(candle.open, { currency })} />
        <TooltipMetric label="Close" value={formatCurrency(candle.close, { currency })} />
        <TooltipMetric label="High" value={formatCurrency(candle.high, { currency })} />
        <TooltipMetric label="Low" value={formatCurrency(candle.low, { currency })} />
      </div>
    </div>
  );
}

function TooltipMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
