import type { CSSProperties } from "react";

import { TIMEFRAME_PRESETS, type TimeframePreset } from "@/modules/prices/pyth/chart-config";

import {
  EMA_ACCENT_COLOR,
  NEGATIVE_PRICE_COLOR,
  NEUTRAL_SIGNAL_COLOR,
  POSITIVE_PRICE_COLOR,
} from "./pyth-chart.constants";
import type { TradeSignal } from "./pyth-chart.types";

type PythChartStatsLike = {
  change: number;
  changePct: number;
  high: number;
  latest: number;
  low: number;
};

export const buildYAxisDomain = (
  stats: PythChartStatsLike | null,
): [number, number] | null => {
  if (!stats) {
    return null;
  }

  const { high, low, latest } = stats;
  if (![high, low, latest].every((value) => Number.isFinite(value))) {
    return null;
  }

  const range = high - low;
  const rangePadding = Math.abs(range) * 0.08;
  const pricePadding = Math.abs(latest) * 0.003;
  const padding = Math.max(rangePadding, pricePadding, 1e-9);
  const lower = low - padding;
  const upper = high + padding;

  if (!(upper > lower)) {
    const fallbackPad = Math.max(Math.abs(latest) * 0.01, 1e-6);
    return [latest - fallbackPad, latest + fallbackPad];
  }

  return [Math.min(low, 0) < 0 ? lower : Math.max(0, lower), upper];
};

export const getPriceTrendPresentation = (change: number) => {
  const isPriceUp = change >= 0;

  return {
    isPriceUp,
    priceLineColor: isPriceUp ? POSITIVE_PRICE_COLOR : NEGATIVE_PRICE_COLOR,
    trendGlyph: isPriceUp ? "▲" : "▼",
  };
};

export const getTradeSignalPresentation = (tradeSignal: TradeSignal | null) => {
  const tradeSignalDirection =
    typeof tradeSignal?.direction === "string"
      ? tradeSignal.direction.toLowerCase()
      : null;

  return {
    tradeSignalColor:
      tradeSignalDirection === "bullish"
        ? POSITIVE_PRICE_COLOR
        : tradeSignalDirection === "bearish"
          ? NEGATIVE_PRICE_COLOR
          : NEUTRAL_SIGNAL_COLOR,
    tradeSignalLabel: tradeSignalDirection
      ? tradeSignalDirection.charAt(0).toUpperCase() + tradeSignalDirection.slice(1)
      : null,
    tradeSignalUpdatedLabel: tradeSignal?.updatedAt
      ? new Date(tradeSignal.updatedAt).toLocaleString()
      : null,
  };
};

export const getPresetMenuState = (
  availablePresets: TimeframePreset[],
  selectedPreset: TimeframePreset,
) => {
  const presetIsCustom = !TIMEFRAME_PRESETS.some(
    (preset) => preset.value === selectedPreset.value,
  );
  const presetTooltip = presetIsCustom
    ? `Candles: ${selectedPreset.resolutionMinutes} min · Range: ${Math.round(
        selectedPreset.rangeDays,
      )} days`
    : undefined;
  const allowed = new Set(availablePresets.map((preset) => preset.value));
  const menuPresets = TIMEFRAME_PRESETS.filter((preset) => allowed.has(preset.value));

  return {
    hasMenuOptions: menuPresets.length > 0,
    menuPresets,
    presetIsCustom,
    presetLabel: selectedPreset.label,
    presetTooltip,
  };
};

export const getLineStyles = (priceLineColor: string) =>
  ({
    "--color-close": priceLineColor,
    "--color-ema": EMA_ACCENT_COLOR,
  }) as CSSProperties;
