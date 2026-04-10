import type { JSX } from "react";
import { CandlestickChart as CandleIcon, LineChart as LineChartIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { IntegrityLayerBadge } from "./price-chart-panel-integrity-badge";
import type { ChartMode, ChartTimeframeOption } from "./price-chart-panel.types";

const TIMEFRAME_BUTTON_CLASS =
  "relative isolate flex h-8 min-w-[32px] items-center justify-center overflow-hidden rounded-md px-2 text-[11px] font-sans font-medium uppercase tracking-[0.16px] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40";

const TIMEFRAME_WIDTH_MAP: Record<string, number> = {
  "1D": 32.3,
  "5D": 32,
  "1M": 34,
  "6M": 39,
  "1Y": 32,
  "5Y": 32,
  MAX: 43,
  YTD: 32.84,
};

type ChartModeToggleProps = {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
  disabled?: boolean;
};

export function ChartModeToggle({
  mode,
  onChange,
  disabled,
}: ChartModeToggleProps): JSX.Element {
  const buttonBase =
    "relative inline-flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40";

  return (
    <div
      className={cn(
        "flex h-[38px] min-w-[92px] items-center gap-1 rounded-lg border border-border bg-muted/20 px-[6px] shadow-sm backdrop-blur-[2px]",
        disabled && "opacity-60",
      )}
      aria-label="Toggle chart type"
    >
      <button
        type="button"
        className={cn(buttonBase, mode === "line" && "text-foreground")}
        aria-pressed={mode === "line"}
        disabled={disabled}
        onClick={() => !disabled && onChange("line")}
      >
        <LineChartIcon className="h-4 w-4" />
        <span className="sr-only">Line</span>
      </button>
      <button
        type="button"
        className={cn(buttonBase, mode === "candle" && "text-foreground")}
        aria-pressed={mode === "candle"}
        disabled={disabled}
        onClick={() => !disabled && onChange("candle")}
      >
        <CandleIcon className="h-4 w-4" />
        <span className="sr-only">Candlestick</span>
      </button>
    </div>
  );
}

type TimeframeSegmentControlProps = {
  options: readonly ChartTimeframeOption[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function TimeframeSegmentControl({
  options,
  activeId,
  onSelect,
}: TimeframeSegmentControlProps): JSX.Element {
  return (
    <div className="flex w-full min-w-[240px] flex-col items-start justify-center sm:w-auto">
      <div className="flex h-[38px] min-h-[38px] w-full max-w-[283.14px] flex-col">
        <div className="flex h-full w-full items-stretch justify-center gap-[3px] rounded-lg border border-border bg-muted/20 p-[3px] shadow-sm backdrop-blur-[2px]">
          {options.map((option) => {
            const isActive = activeId === option.id;
            const width = TIMEFRAME_WIDTH_MAP[option.id] ?? 32;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                aria-pressed={isActive}
                className={cn(
                  TIMEFRAME_BUTTON_CLASS,
                  "text-muted-foreground hover:text-foreground",
                  isActive && "text-foreground",
                )}
                style={{ width }}
              >
                <span className="relative z-1">{option.label}</span>
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-px rounded-[6px] bg-muted"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { IntegrityLayerBadge };
