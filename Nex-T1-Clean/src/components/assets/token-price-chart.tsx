"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TokenPriceChartProps {
  initialData?: [number, number][]; // [timestamp, value]
  type?: "price" | "volume" | "tvl";
}

export function TokenPriceChart({ initialData = [], type = "price" }: TokenPriceChartProps) {
  
  const chartData = useMemo(() => {
    return initialData.map(([timestamp, value]) => ({
      date: timestamp,
      value: value,
    }));
  }, [initialData]);




  const priceColor = "hsl(var(--primary))";
  const volumeColor = "hsl(var(--secondary))";

  if (chartData.length === 0) {
    return (
        <div className="flex h-full w-full items-center justify-center">
           <p className="text-muted-foreground text-sm">No {type} data available</p>
        </div>
    );
  }

  const formatValue = (val: number) => {
      if (type === "volume" || type === "tvl") {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(val);
      }
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const ChartComponent = type === "volume" ? BarChart : AreaChart;

  const CustomizedDot = (props: UntypedJson) => {
    const { cx, cy, stroke, index, data } = props;
    
    if (index === data.length - 1) {
      return (
        <g>
          {/* Pulse effect */}
          <circle cx={cx} cy={cy} r="8" fill={stroke} fillOpacity="0.2">
            <animate attributeName="r" from="4" to="12" dur="1.5s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
          </circle>
          {/* Solid center */}
          <circle cx={cx} cy={cy} r="4" fill={stroke} stroke="hsl(var(--background))" strokeWidth={2} />
        </g>
      );
    }
  
    return null;
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0 -z-10">
          <div className="h-full w-full [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-[0.35]" />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={type === "volume" ? volumeColor : priceColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={type === "volume" ? volumeColor : priceColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={volumeColor} stopOpacity={1} />
              <stop offset="100%" stopColor={volumeColor} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="volumeCursorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={volumeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={volumeColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            minTickGap={30}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            cursor={type === "volume" ? { fill: "url(#volumeCursorGradient)" } : { stroke: priceColor, strokeWidth: 1, strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur-md">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(data.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <div className="font-bold text-foreground text-lg">
                      {type === "price" && "$"}{formatValue(data.value)}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {type === "volume" ? (
              <Bar dataKey="value" fill="url(#volumeGradient)" radius={[4, 4, 0, 0]} />
          ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke={priceColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={1000}
                dot={<CustomizedDot data={chartData} />}
              />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
