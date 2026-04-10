"use client"

import Image from "next/image"
import { Artifact } from "@/components/ai-elements/artifact"
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { useState } from "react"
import { getPrimaryIcon } from "@/lib/token-icons"

export interface PriceChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  data: PriceChartData[];
  symbol: string;
  name?: string;
  type?: 'line' | 'ohlc' | 'bar';
  logo?: string;
}

// Chart component implementation starts here

export function PriceChartArtifact({ 
  data, 
  symbol, 
  name, 
  type = 'line',
  logo 
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState("All")
  
  // Color determination
  const isPositive = (data[data.length - 1]?.close ?? 0) >= (data[0]?.close ?? 0);
  const color = isPositive ? '#10B981' : '#EF4444'; // Emerald or Red

  const resolvedLogo = logo || getPrimaryIcon({ symbol });

  return (
     <Artifact className="w-full max-w-3xl mx-auto p-6 h-auto">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              {resolvedLogo ? (
                 <Image src={resolvedLogo} alt={symbol} width={40} height={40} className="rounded-full" unoptimized />
              ) : (
                 <div className="size-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                     {symbol[0]}
                 </div>
              )}
              <div>
                 <h2 className="text-sm font-medium text-neutral-400">{name || symbol}</h2>
                 <div className="flex items-baseline gap-2">
                     <span className="text-2xl font-semibold text-white">
                         ${data[data.length - 1]?.close.toLocaleString() ?? '0.00'}
                     </span>
                     <span className={`text-sm font-medium ${isPositive ? 'text-[#8eb94f]' : 'text-red-500'}`}>
                         {isPositive ? '+' : ''}{((data[data.length - 1]?.close - data[0]?.close) / data[0]?.close * 100).toFixed(2)}%
                     </span>
                 </div>
              </div>
           </div>
              
           <div className="flex gap-2">
              {['1H', '1D', '1W', '1M', '1Y'].map((range) => (
                 <button
                   key={range}
                   onClick={() => setTimeRange(range)}
                   className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      timeRange === range 
                        ? 'bg-neutral-700/50 border-white/10 text-white' 
                        : 'bg-neutral-800/40 border-white/5 text-neutral-400 hover:bg-white/5'
                   }`}
                 >
                    {range}
                 </button>
              ))}
           </div>
        </div>

           {/* Chart Area */}
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 {type === 'bar' ? (
                     <BarChart data={data} barCategoryGap={2}>
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                           itemStyle={{ color: '#fff' }}
                        />
                         <Bar dataKey="close" fill={color} radius={[2, 2, 0, 0]} />
                     </BarChart>
                 ) : (
                     <AreaChart data={data}>
                        <defs>
                           <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis 
                           dataKey="time" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#737373', fontSize: 10 }} 
                        />
                        <YAxis 
                           dataKey="close" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#737373', fontSize: 10 }}
                           domain={['auto', 'auto']}
                           tickFormatter={(val) => `$${val}`}
                        />
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                           itemStyle={{ color: '#fff' }}
                           labelStyle={{ color: '#888' }}
                        />
                        <Area 
                           type="monotone" 
                           dataKey="close" 
                           stroke={color} 
                           strokeWidth={2}
                           fillOpacity={1} 
                           fill="url(#colorPrice)" 
                        />
                     </AreaChart>
                 )}
              </ResponsiveContainer>
           </div>
     </Artifact>
  )
}
