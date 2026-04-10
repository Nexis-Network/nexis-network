"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";
import { History } from "lucide-react";

interface VestingData {
  id: string;
  ticker: string;
  name: string;
  totalLimit?: number;
  unlocked?: number;
  unlockedPercent?: number;
  nextUnlock?: {
    date: string;
    amount: number;
    percent: number;
  };
}

interface VestingChartItem {
  date: string;
  amount: number;
  category: string;
}

interface VestingTableProps {
  data: VestingData | null;
  chart: VestingChartItem[];
  isLoading?: boolean;
}

export function VestingTable({
  data,
  chart,
  isLoading
}: VestingTableProps) {
  
  const chartData = useMemo(() => {
    if (!chart || chart.length === 0) return [];
    // Aggregate by date if multiple categories exist for same date, or just flatten.
    // Assuming strictly time-series for total unlocked for now.
    // If strict categories, we'd need stacked area. 
    // Let's simplified: map to timestamp and amount.
    return chart.map(item => ({
       date: item.date,
       timestamp: new Date(item.date).getTime(),
       amount: item.amount,
       category: item.category
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [chart]);

  if (!data && (!chart || chart.length === 0) && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mb-3 opacity-20" />
        <p>No vesting data found</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* Vesting Stats */}
      {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-border/60 rounded-xl bg-card">
              <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Supply</div>
                  <div className="text-lg font-bold text-foreground">{data.totalLimit ? formatNumber(data.totalLimit) : 'N/A'}</div>
              </div>
              <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unlocked</div>
                  <div className="text-lg font-bold text-foreground">
                      {data.unlocked ? formatNumber(data.unlocked) : '0'} 
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({data.unlockedPercent?.toFixed(2)}%)
                      </span>
                  </div>
              </div>
              <div>
                   <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Locked</div>
                   <div className="text-lg font-bold text-foreground">
                       {data.totalLimit && data.unlocked 
                          ? formatNumber(data.totalLimit - data.unlocked) 
                          : 'N/A'}
                   </div>
              </div>
              <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Unlock</div>
                  <div className="text-sm font-medium text-foreground">
                      {data.nextUnlock?.date ? new Date(data.nextUnlock.date).toLocaleDateString() : 'Fully Unlocked'}
                  </div>
                   {data.nextUnlock && (
                       <div className="text-xs text-emerald-500 mt-0.5">
                           +{formatNumber(data.nextUnlock.amount)} ({data.nextUnlock.percent}%)
                       </div>
                   )}
              </div>
          </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
          <div className="h-[350px] w-full bg-card rounded-xl border border-border/60 p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Vesting Schedule</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="vestingColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                            minTickGap={30}
                        />
                        <YAxis 
                            hide 
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="rounded-lg border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur-md">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {new Date(d.date).toLocaleDateString()}
                                      </div>
                                      <div className="font-bold text-foreground">
                                        {formatNumber(d.amount)} Tokens
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1} 
                            fill="url(#vestingColor)" 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>
      )}
    </div>
  );
}
