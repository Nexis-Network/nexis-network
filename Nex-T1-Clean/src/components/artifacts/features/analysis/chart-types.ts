export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  title: string;
  description?: string;
  xAxisKey: string;
  xAxisLabel?: string;
  yAxisKeys: string[];
  yAxisLabel?: string;
  colors?: Record<string, string>;
  dataKey?: string; // For pie chart
  nameKey?: string; // For pie chart
}

export interface InteractiveChartData {
  config: ChartConfig;
  data: Array<Record<string, UntypedJson>>;
}
