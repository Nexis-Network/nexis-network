import type { TimeframePreset } from "@/modules/prices/pyth/chart-config";

export type PriceDatum = {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartPoint = PriceDatum & {
  ema: number;
};

export type ChartPointerState = {
  activePayload?: Array<{
    payload?: ChartPoint;
  }>;
};

export type TradeSignal = {
  indicator: string;
  direction: "bullish" | "bearish" | "neutral" | (string & {});
  score: number | null;
  updatedAt: string | null;
};

export type TrendPoint = {
  date: string;
  value: number;
};

export type TrendLineShape = {
  id: string;
  start: TrendPoint;
  end: TrendPoint;
};

export type PythChartProps = {
  ticker: string;
  priceFeedId?: string;
  resolutionMinutes?: number;
  lookbackDays?: number;
  className?: string;
};

export type LatestInfo = {
  price: number;
  emaPrice: number | null;
  publishTime: number;
};

export type LatestResponse = {
  price: number;
  publishTime: number;
  emaPrice?: number | null;
};

export type ChartGeometryProps = {
  xAxisMap?: Record<
    string,
    {
      scale?: (value: UntypedJson) => number;
    } | undefined
  >;
  yAxisMap?: Record<
    string,
    {
      scale?: (value: UntypedJson) => number;
    } | undefined
  >;
  offset?: {
    left?: number;
    top?: number;
  };
};

export type TrendLinesOverlayProps = ChartGeometryProps & {
  trendLines: TrendLineShape[];
  draftLine: TrendLineShape | null;
};

export type PythChartSelectionState = {
  activeRangeDays: number;
  activeResolutionMinutes: number;
  availablePresets: TimeframePreset[];
  selectedPreset: TimeframePreset;
};
