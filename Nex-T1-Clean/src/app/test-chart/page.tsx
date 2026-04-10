"use client";

import { InteractiveChartArtifact } from "@/components/artifacts/features/analysis/chart-artifact";
import { InteractiveChartData } from "@/components/artifacts/chart-types";

// Skip static prerender — React SSR context unavailable during build

const TEST_DATA_LINE: InteractiveChartData = {
  config: {
    type: "line",
    title: "Monthly Sales Growth",
    description: "Revenue over the last 6 months",
    xAxisKey: "month",
    yAxisKeys: ["revenue", "profit"],
    yAxisLabel: "Amount ($)",
    xAxisLabel: "Month"
  },
  data: [
    { month: "Jan", revenue: 4000, profit: 2400 },
    { month: "Feb", revenue: 3000, profit: 1398 },
    { month: "Mar", revenue: 2000, profit: 9800 },
    { month: "Apr", revenue: 2780, profit: 3908 },
    { month: "May", revenue: 1890, profit: 4800 },
    { month: "Jun", revenue: 2390, profit: 3800 },
  ]
};

const TEST_DATA_BAR: InteractiveChartData = {
  config: {
    type: "bar",
    title: "Project Distribution",
    xAxisKey: "name",
    yAxisKeys: ["completed", "active"],
    colors: { completed: "#22c55e", active: "#3b82f6" }
  },
  data: [
    { name: "Team A", completed: 12, active: 5 },
    { name: "Team B", completed: 8, active: 10 },
    { name: "Team C", completed: 15, active: 2 },
  ]
};

const TEST_DATA_PIE: InteractiveChartData = {
  config: {
    type: "pie",
    title: "Browser Usage",
    xAxisKey: "name", // used as nameKey
    yAxisKeys: ["value"], // used as dataKey
  },
  data: [
    { name: "Chrome", value: 400 },
    { name: "Firefox", value: 300 },
    { name: "Safari", value: 300 },
    { name: "Edge", value: 200 },
  ]
};

export default function TestChartPage() {
  return (
    <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold">Interactive Chart Artifact Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 h-[500px]">
           <InteractiveChartArtifact data={TEST_DATA_LINE} />
        </div>
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 h-[500px]">
           <InteractiveChartArtifact data={TEST_DATA_BAR} />
        </div>
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 h-[500px]">
           <InteractiveChartArtifact data={TEST_DATA_PIE} />
        </div>
      </div>
    </div>
  );
}
