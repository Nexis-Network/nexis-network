"use client"

import { Artifact } from "@/components/ai-elements/artifact"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState } from "react"
import { X } from "lucide-react"
import { getPrimaryIcon } from "@/lib/token-icons"
import Image from "next/image"

interface TransactionChartData {
  name: string;
  value: number;
}

interface TokenInfo {
  symbol: string;
  name: string;
  logo?: string; // URL or fallback
  color?: string; // Optional override
}

interface TransactionChartProps {
  data?: TransactionChartData[];
  tokens?: TokenInfo[];
  title?: string;
  period?: string;
}

const defaultData = [
  { name: 'Jan', value: 150 },
  { name: 'Feb', value: 160 },
  { name: 'Mar', value: 300 },
  { name: 'Apr', value: 320 },
  { name: 'May', value: 450 },
  { name: 'Jun', value: 450 },
  { name: 'Jul', value: 250 },
  { name: 'Aug', value: 240 },
  { name: 'Sep', value: 220 },
  { name: 'Oct', value: 150 },
  { name: 'Nov', value: 160 },
  { name: 'Dec', value: 140 },
];

const defaultTokens: TokenInfo[] = [
  { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { symbol: "OP", name: "Optimism", color: "#FF0420" },
  { symbol: "SOL", name: "Solana", color: "#000000" }
];

export function TransactionChartArtifact({ 
  data = defaultData, 
  tokens = defaultTokens, 
  title = "Total Transactions",
  period = "All"
}: TransactionChartProps) {
  const [timeRange, setTimeRange] = useState(period)
  
  return (
     <Artifact className="w-full max-w-2xl mx-auto overflow-visible shadow-2xl p-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-sm font-medium text-neutral-400">{title}</h2>
           
           {/* Time Range Toggles */}
           <div className="flex gap-2">
              {['30d', '6m', 'All'].map((range) => (
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

        {/* Filter Pills */}
        <div className="flex gap-2 mb-8 flex-wrap">
           {tokens.map((token) => {
             const logoUrl = token.logo || getPrimaryIcon({ symbol: token.symbol });
             
             return (
             <div key={token.symbol} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800/40 border border-white/5 text-neutral-300">
                {logoUrl ? (
                   <Image src={logoUrl} alt={token.symbol} width={16} height={16} className="size-4 rounded-full" />
                ) : (
                   <div 
                     className="size-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                     style={{ backgroundColor: token.color || '#333' }}
                   >
                     {token.symbol[0]}
                   </div>
                )}
                <span className="text-xs font-medium">{token.name}</span>
                <button className="text-neutral-500 hover:text-white ml-1"><X className="size-3" /></button>
             </div>
           )})}
        </div>

        {/* Chart Area */}
        <div className="h-[250px] w-full">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap={2}>
                 <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#737373', fontSize: 10 }} 
                    dy={10}
                 />
                 <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#737373', fontSize: 10 }}
                    tickFormatter={(value) => `$${value}M`}
                    dx={-10}
                 />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                 />
                 <Bar 
                    dataKey="value" 
                    fill="#333" 
                    radius={[2, 2, 0, 0]} 
                    activeBar={{ fill: '#666' }} 
                 />
              </BarChart>
           </ResponsiveContainer>
        </div>
     </Artifact>
  )
}
