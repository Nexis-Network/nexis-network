export type ChartType = "line" | "bar" | "scatter" | "pie" | "area" | "composed";

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  description?: string;
  xAxisKey: string;
  yAxisKeys: string[];
  // Map of data key to color (hex)
  colors?: Record<string, string>;
  // Optional labels for axes
  xAxisLabel?: string;
  yAxisLabel?: string;
  // For scatter plots
  zAxisKey?: string; 
  // For Pie charts
  nameKey?: string;
  dataKey?: string;
}

export interface InteractiveChartData {
  config: ChartConfig;
  data: ChartDataPoint[];
}
