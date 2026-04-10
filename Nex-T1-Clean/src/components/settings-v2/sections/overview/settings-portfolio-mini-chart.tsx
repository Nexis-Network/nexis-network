"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { SettingsPortfolioSeriesPoint } from "@/lib/portfolio/settings-summary";

const EMPTY_BAR_HEIGHT_RATIO = 10;
const MIN_FILLED_BAR_HEIGHT_RATIO = 18;

const EMPTY_POINT: SettingsPortfolioSeriesPoint = {
  timestamp: 0,
  valueUsd: 0,
  volumeUsd: 0,
  buyVolumeUsd: 0,
  sellVolumeUsd: 0,
  buyCount: 0,
  sellCount: 0,
  color: "currentColor",
  empty: true,
};

type SettingsPortfolioMiniChartProps = {
  label: string;
  series: SettingsPortfolioSeriesPoint[];
  priceUsd?: number | null;
  activeIndex: number | null;
  reducedMotion?: boolean;
  onPointEnter: (index: number) => void;
  onPointLeave?: () => void;
};

function formatPointLabel(timestamp: number, isIntraday: boolean, locale: string) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(
    locale,
    isIntraday
      ? {
          month: "short",
          day: "numeric",
          hour: "numeric",
        }
      : {
          month: "short",
          day: "numeric",
        },
  ).format(date);
}

function formatUsd(value: number | null | undefined, locale: string, maximumFractionDigits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1_000 ? 0 : maximumFractionDigits,
  });
}

function formatPrice(value: number | null | undefined, locale: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const maximumFractionDigits = value >= 1_000 ? 0 : value >= 1 ? 2 : 4;
  return formatUsd(value, locale, maximumFractionDigits);
}

function formatTradeBreakdown(
  volumeUsd: number | null | undefined,
  count: number | null | undefined,
  locale: string,
) {
  const safeCount = typeof count === "number" && Number.isFinite(count) ? count : 0;
  return `${formatUsd(volumeUsd ?? 0, locale)} · ${safeCount}`;
}

function resolveBarMetric(point: SettingsPortfolioSeriesPoint) {
  return typeof point.volumeUsd === "number" && Number.isFinite(point.volumeUsd)
    ? point.volumeUsd
    : point.valueUsd;
}

function isIntradaySeries(series: SettingsPortfolioSeriesPoint[]) {
  if (series.length < 2) {
    return false;
  }

  const stepMs = Math.abs(series[1].timestamp - series[0].timestamp);
  return stepMs < 12 * 60 * 60 * 1000;
}

export function SettingsPortfolioMiniChart({
  label,
  series,
  priceUsd,
  activeIndex,
  reducedMotion = false,
  onPointEnter,
  onPointLeave,
}: SettingsPortfolioMiniChartProps) {
  const locale = useLocale();
  const chartSeries = series.length > 0 ? series : [EMPTY_POINT];
  const nonEmptyValues = chartSeries
    .map((point) => resolveBarMetric(point))
    .filter((value) => value > 0);
  const maxValue = Math.max(...nonEmptyValues, 0);
  const minValue = nonEmptyValues.length > 0 ? Math.min(...nonEmptyValues) : 0;
  const hasSpread = maxValue > minValue;
  const intradaySeries = isIntradaySeries(chartSeries);
  const barWidthClass =
    chartSeries.length >= 24 ? "w-1" : chartSeries.length >= 12 ? "w-1.5" : "w-2";

  return (
    <div className="space-y-2" onMouseLeave={onPointLeave}>
      <div aria-hidden="true" className="h-px w-full bg-border/70" />
      <div className="flex h-8 items-end gap-1">
        {chartSeries.map((point, index) => {
          const metricValue = resolveBarMetric(point);
          const hasValue = metricValue > 0;
          const normalizedValue = hasValue
            ? hasSpread
              ? (metricValue - minValue) / (maxValue - minValue)
              : 1
            : 0;
          const barHeight = hasValue
            ? MIN_FILLED_BAR_HEIGHT_RATIO + normalizedValue * (100 - MIN_FILLED_BAR_HEIGHT_RATIO)
            : EMPTY_BAR_HEIGHT_RATIO;
          const isActive = activeIndex === index;

          return (
            <Tooltip key={`${label}-${point.timestamp}-${index}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${label} activity ${formatPointLabel(point.timestamp, intradaySeries, locale)} ${formatUsd(
                    metricValue,
                    locale,
                  )}`}
                  data-active={isActive ? "true" : "false"}
                  onMouseEnter={() => onPointEnter(index)}
                  onFocus={() => onPointEnter(index)}
                  onBlur={() => onPointLeave?.()}
                  onClick={() => onPointEnter(index)}
                  className={cn(
                    "group flex flex-1 items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    reducedMotion ? "" : "transition-transform duration-150 hover:-translate-y-0.5",
                  )}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 10 100"
                    className={cn(
                      "origin-bottom",
                      barWidthClass,
                      reducedMotion ? "" : "transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110",
                    )}
                    preserveAspectRatio="none"
                  >
                    <rect
                      x="0"
                      y={100 - barHeight}
                      width="10"
                      height={barHeight}
                      rx="5"
                      fill={point.color}
                      opacity={isActive ? 1 : point.empty ? 0.32 : 0.78}
                    />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                className="w-56 px-3 py-2"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatPointLabel(point.timestamp, intradaySeries, locale)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-foreground">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Volume</span>
                      <span className="font-medium">{formatUsd(point.volumeUsd ?? metricValue, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">{formatPrice(priceUsd, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Buy</span>
                      <span className="font-medium text-chart-2">
                        {formatTradeBreakdown(point.buyVolumeUsd, point.buyCount, locale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Sell</span>
                      <span className="font-medium text-chart-5">
                        {formatTradeBreakdown(point.sellVolumeUsd, point.sellCount, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
