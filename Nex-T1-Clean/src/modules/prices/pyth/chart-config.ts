export type TimeframePreset = {
  value: string;
  label: string;
  resolutionMinutes: number;
  rangeDays: number;
};

export const TIMEFRAME_PRESETS: readonly TimeframePreset[] = [
  { value: "1m", label: "1 min", resolutionMinutes: 1, rangeDays: 2 },
  { value: "5m", label: "5 mins", resolutionMinutes: 5, rangeDays: 7 },
  { value: "15m", label: "15 mins", resolutionMinutes: 15, rangeDays: 14 },
  { value: "30m", label: "30 mins", resolutionMinutes: 30, rangeDays: 21 },
  { value: "1h", label: "1 hour", resolutionMinutes: 60, rangeDays: 45 },
  { value: "4h", label: "4 hours", resolutionMinutes: 240, rangeDays: 120 },
  { value: "12h", label: "12 hours", resolutionMinutes: 720, rangeDays: 240 },
  { value: "1d", label: "1 day", resolutionMinutes: 1440, rangeDays: 365 },
  { value: "1w", label: "1 week", resolutionMinutes: 10080, rangeDays: 365 * 2 },
  { value: "1mo", label: "1 month", resolutionMinutes: 43200, rangeDays: 365 * 5 },
];

const MATCH_RANGE_TOLERANCE = 0.15;

export function resolvePresetFromProps(resolution: number, rangeDays: number): TimeframePreset {
  const normalizedRange = Math.max(rangeDays, 1);
  const match = TIMEFRAME_PRESETS.find((preset) => {
    if (preset.resolutionMinutes !== resolution) {
      return false;
    }
    const tolerance = Math.max(1, preset.rangeDays * MATCH_RANGE_TOLERANCE);
    return Math.abs(preset.rangeDays - normalizedRange) <= tolerance;
  });

  if (match) {
    return match;
  }

  return {
    value: `custom-${resolution}-${Math.round(normalizedRange)}`,
    label: "Custom",
    resolutionMinutes: resolution,
    rangeDays: normalizedRange,
  };
}
