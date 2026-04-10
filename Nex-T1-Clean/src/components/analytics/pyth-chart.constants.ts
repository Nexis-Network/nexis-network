import type { ChartConfig } from "@/components/ui/chart";
import {
  TIMEFRAME_PRESETS,
  type TimeframePreset,
} from "@/modules/prices/pyth/chart-config";

export const POSITIVE_PRICE_COLOR = "#3ce7c2";
export const NEGATIVE_PRICE_COLOR = "#ff5c7a";
export const NEUTRAL_SIGNAL_COLOR = "#facc15";
export const EMA_ACCENT_COLOR = "#9fa7ff";

export const DEFAULT_VISIBLE_POINTS = 96;
export const MIN_VISIBLE_POINTS = 24;

export const PYTH_CHART_CONFIG: ChartConfig = {
  close: {
    label: "Price",
    color: POSITIVE_PRICE_COLOR,
  },
  ema: {
    label: "EMA (12)",
    color: EMA_ACCENT_COLOR,
  },
};

const PRESET_ORDER = new Map(
  TIMEFRAME_PRESETS.map((preset, index) => [preset.value, index]),
);

export const sortPresets = (list: TimeframePreset[]): TimeframePreset[] => {
  if (list.length <= 1) {
    return list;
  }

  return [...list].sort((a, b) => {
    const aIndex = PRESET_ORDER.get(a.value) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = PRESET_ORDER.get(b.value) ?? Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
};
