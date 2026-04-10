"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AgentPerformancePoint = {
  bucket: string;
  pnlUsd: number;
  trades: number;
};

type AgentPerformanceChartProps = {
  data: AgentPerformancePoint[];
};

export function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
  const isPositive = useMemo(() => (data.length ? data[data.length - 1].pnlUsd >= 0 : true), [data]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value as number)}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "P&L"]}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            contentStyle={{
              background: "rgba(17, 24, 39, 0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              color: "white",
            }}
          />
          <Line
            type="monotone"
            dataKey="pnlUsd"
            stroke={isPositive ? "#34d399" : "#f87171"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  });
  return formatter.format(value);
}
