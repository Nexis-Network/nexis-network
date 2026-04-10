
"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatFiat } from "@/lib/formatters/wallet";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PortfolioSnapshot {
  id: string;
  total_usd: number;
  timestamp: string; // ISO string
}

interface NetworthChartProps {
  data: PortfolioSnapshot[];
  className?: string;
  isLoading?: boolean;
}

export function NetworthChart({ data, className, isLoading }: NetworthChartProps) {
  const chartData = useMemo(() => {
    return data
      .map((item) => ({
        date: new Date(item.timestamp),
        value: Number(item.total_usd),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  if (isLoading) {
    return (
        <Card className={cn("w-full h-[400px] flex items-center justify-center bg-zinc-900/50 border-zinc-800", className)}>
             <div className="text-zinc-500 animate-pulse">Loading Chart...</div>
        </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className={cn("w-full h-[400px] flex items-center justify-center bg-zinc-900/50 border-zinc-800", className)}>
        <div className="text-zinc-500">No historical data available</div>
      </Card>
    );
  }

  // Calculate min/max domain for better visual scaling
  const minValue = Math.min(...chartData.map((d) => d.value));
  const maxValue = Math.max(...chartData.map((d) => d.value));
  const padding = (maxValue - minValue) * 0.1; // 10% padding

  return (
    <Card className={cn("w-full border-zinc-800 bg-zinc-900/30 backbackdrop-blur-lg", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-zinc-100">Net Worth History</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(date, "MMM dd")}
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                hide={false}
                tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`} // Simplified for compactness
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[Math.max(0, minValue - padding), 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
                        <p className="mb-1 text-xs text-zinc-400">
                          {format(label, "MMM dd, yyyy HH:mm")}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {formatFiat(Number(payload[0].value))}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
