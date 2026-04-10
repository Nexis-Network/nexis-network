import type { BarProps } from "recharts";

export type ChartPoint = {
  timestamp: number;
  price: number;
};

export type PriceChartSeries = {
  id: string;
  assetType: "token" | "nft";
  name: string;
  symbol: string;
  points: ChartPoint[];
  logoUrl?: string | null;
  color?: string;
  isPrimary?: boolean;
};

export type ChartTimeframeOption = {
  id: string;
  label: string;
  days: number | string;
  interval?: string;
};

export type PriceStatSnapshot = {
  price: number | null;
  deltaLabel: string;
  deltaAbsoluteLabel?: string | null;
  isPositive: boolean | null;
  timestamp: number | null;
  relativeLabel: string;
  assetType: "token" | "nft";
};

export type PriceChartPanelProps = {
  series: PriceChartSeries[];
  timeframe: string;
  options: readonly ChartTimeframeOption[];
  onChangeTimeframe: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onPriceStatChange?: (snapshot: PriceStatSnapshot) => void;
  dailyHigh?: number | null;
  dailyLow?: number | null;
  primaryAssetId?: string;
  vsCurrency?: string;
};

export type ChartStats = {
  latestPrice: number | null;
  deltaPercent: number | null;
  deltaAbsolute: number | null;
};

export type Tone = "positive" | "negative" | "neutral";

export type ChartMode = "line" | "candle";

export type ProcessedSeries = PriceChartSeries & {
  sanitized: ChartPoint[];
  stats: ChartStats;
  tone: Tone;
  color: string;
  dataKey: string;
  gradientId: string;
  isPrimary: boolean;
};

export type CandleDatum = {
  timestamp: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
};

export type CombinedPoint = {
  timestamp: number;
  label: string;
  [key: string]: number | string | null;
};

export type CandleBarProps = Pick<BarProps, "fill" | "width" | "x" | "yAxis"> & {
  payload?: CandleDatum;
};

export type TooltipPayloadItem = {
  dataKey?: string;
  value?: number | string | null;
  payload?: {
    label?: string;
    [key: string]: UntypedJson;
  };
  [key: string]: UntypedJson;
};

export type ActiveDotProps = {
  cx?: number;
  cy?: number;
  fill?: string;
  index?: number;
  payload?: Record<string, UntypedJson>;
  stroke?: string;
};
