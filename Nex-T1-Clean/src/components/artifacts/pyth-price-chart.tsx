
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

export interface PythChartData {
  symbol: string;
  price: number;
  confidence: number;
  timestamp: string;
  history: { time: string; value: number }[];
}

export function PythPriceChartArtifact({ data }: { data: PythChartData }) {
  const isPositive = data.history.length > 1 && 
    data.history[data.history.length - 1].value >= data.history[0].value;

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-background/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
              <CardTitle className="text-base font-medium">{data.symbol}/USD</CardTitle>
              <p className="text-xs text-muted-foreground">Pyth Network Oracle</p>
          </div>
          <div className="text-right">
              <div className="text-2xl font-bold">${data.price.toLocaleString()}</div>
              <Badge variant="outline" className="text-[10px] bg-background/40">
                  CONF ±${data.confidence.toFixed(4)}
              </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.history}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                    itemStyle={{ color: 'var(--card-foreground)' }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, "Price"]}
                />
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={isPositive ? "#10b981" : "#ef4444"} 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
             <span>Market Open</span>
             <span>Live</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
