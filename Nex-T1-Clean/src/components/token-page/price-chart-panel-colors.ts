import type { Tone } from "./price-chart-panel.types";

export const POSITIVE_COLOR = "#38bdf8";
export const NEGATIVE_COLOR = "#FF5459";
export const NEUTRAL_COLOR = "var(--foreground)";

const SERIES_PALETTES: Record<Tone, string>[] = [
  { positive: POSITIVE_COLOR, negative: NEGATIVE_COLOR, neutral: NEUTRAL_COLOR },
  { positive: "#31B8C6", negative: "#E68161", neutral: "#C5C5C1" },
  { positive: "#A855F7", negative: "#F97316", neutral: "#B0B0AA" },
];

export function resolveSeriesColor(
  index: number,
  tone: Tone,
  isPrimary: boolean,
  explicitColor?: string,
): string {
  if (explicitColor) {
    return explicitColor;
  }

  const paletteIndex = isPrimary ? 0 : Math.min(index, SERIES_PALETTES.length - 1);
  return SERIES_PALETTES[paletteIndex][tone];
}
