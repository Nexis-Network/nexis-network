import type { JSX } from "react";
import { Check, ChevronDown, RefreshCw } from "lucide-react";

import { TokenIcon } from "@/components/ai-elements/token-mention";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatUsd } from "@/modules/prices/pyth/base";
import type { TimeframePreset } from "@/modules/prices/pyth/chart-config";

import type { TradeSignal } from "./pyth-chart.types";

type PythChartHeaderProps = {
  canClearTrendLines: boolean;
  drawButtonLabel: string;
  drawHint: string | null;
  handleClearTrendLines: () => void;
  handlePresetSelect: (preset: TimeframePreset) => void;
  handleRetrySignal: () => void;
  handleToggleDrawMode: () => void;
  hasMenuOptions: boolean;
  isDrawMode: boolean;
  isSignalLoading: boolean;
  latestComputedEma: number | null;
  menuPresets: TimeframePreset[];
  presetIsCustom: boolean;
  presetLabel: string;
  presetTooltip?: string;
  priceLineColor: string;
  primarySymbol: string | null;
  selectedPreset: TimeframePreset;
  signalError: string | null;
  stats: {
    changePct: number;
    latest: number;
    publishTime: number;
  } | null;
  ticker: string;
  tradeSignal: TradeSignal | null;
  tradeSignalColor: string;
  tradeSignalLabel: string | null;
  tradeSignalUpdatedLabel: string | null;
  trendGlyph: string;
};

export function PythChartHeader({
  canClearTrendLines,
  drawButtonLabel,
  drawHint,
  handleClearTrendLines,
  handlePresetSelect,
  handleRetrySignal,
  handleToggleDrawMode,
  hasMenuOptions,
  isDrawMode,
  isSignalLoading,
  latestComputedEma,
  menuPresets,
  presetIsCustom,
  presetLabel,
  presetTooltip,
  priceLineColor,
  primarySymbol,
  selectedPreset,
  signalError,
  stats,
  ticker,
  tradeSignal,
  tradeSignalColor,
  tradeSignalLabel,
  tradeSignalUpdatedLabel,
  trendGlyph,
}: PythChartHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        {primarySymbol ? (
          <div className="mt-0.5">
            <TokenIcon size={30} symbol={primarySymbol} name={ticker} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="font-regular text-sm text-foreground">{ticker}</p>
          {stats ? (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(stats.publishTime * 1000).toLocaleString()} ·
              <span className="ml-1 font-medium text-foreground">
                {formatUsd(stats.latest)}
              </span>
              <span className="ml-2 font-medium" style={{ color: priceLineColor }}>
                {trendGlyph} {stats.changePct.toFixed(2)}%
              </span>
            </p>
          ) : null}
          {tradeSignal ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-regular uppercase tracking-wide">
                Token Metrics
              </span>
              <span>
                Trade signal:
                <span className="ml-1 font-regular" style={{ color: tradeSignalColor }}>
                  {tradeSignalLabel ?? "Neutral"}
                </span>
                {tradeSignal.score != null ? (
                  <span className="ml-1 text-muted-foreground">
                    Score {tradeSignal.score.toFixed(1)}
                  </span>
                ) : null}
              </span>
              {tradeSignalUpdatedLabel ? (
                <span className="text-[10px] text-muted-foreground/80">
                  Updated {tradeSignalUpdatedLabel}
                </span>
              ) : null}
            </div>
          ) : signalError ? (
            <button
              type="button"
              onClick={handleRetrySignal}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Retry Token Metrics signal
            </button>
          ) : isSignalLoading ? (
            <span className="text-[11px] text-muted-foreground">
              Loading Token Metrics signal…
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md px-3 text-xs"
                title={presetTooltip}
                disabled={!hasMenuOptions}
              >
                {presetLabel}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            {hasMenuOptions ? (
              <DropdownMenuContent align="end" className="w-[160px] rounded-xl">
                {menuPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.value}
                    className="flex cursor-pointer items-center justify-between rounded-xl text-xs"
                    onSelect={() => handlePresetSelect(preset)}
                  >
                    <span>{preset.label}</span>
                    {selectedPreset.value === preset.value ? (
                      <Check className="h-3 w-3 text-inherit" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            ) : null}
          </DropdownMenu>
          <Button
            variant={isDrawMode ? "default" : "outline"}
            size="sm"
            className="h-8 rounded-md px-3 text-xs"
            onClick={handleToggleDrawMode}
          >
            {drawButtonLabel}
          </Button>
          {canClearTrendLines ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-3 text-xs"
              onClick={handleClearTrendLines}
            >
              Clear Lines
            </Button>
          ) : null}
        </div>
        {drawHint ? (
          <span className="text-end text-[10px] text-muted-foreground/80">{drawHint}</span>
        ) : null}
        {presetIsCustom && presetTooltip ? (
          <span className="text-[10px] text-muted-foreground/80">{presetTooltip}</span>
        ) : null}
        {latestComputedEma !== null ? (
          <span className="inline-flex items-center rounded-lg bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            EMA: {formatUsd(latestComputedEma)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
