import type { PythChartProps } from "./pyth-chart.types";
import { PythChartCard } from "./pyth-chart-card";

export function PythChart(props: PythChartProps) {
  return <PythChartCard {...props} />;
}

export { ChartSkeleton } from "./pyth-chart-skeleton";
