"use client";

import React from "react";
import { ChevronDown, LineChart, CandlestickChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartControlsProps {
  className?: string;
  timeframe: string;
  interval: string;
}

export function ChartControls({ className, timeframe = "1d", interval = "15m" }: ChartControlsProps) {
  return (
    <div className={cn("flex flex-row items-center gap-4", className)}>
      <div className="flex items-center bg-[#131313] border border-white/10 rounded-lg p-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 transition-colors rounded-md text-sm text-gray-400">
          Timeframe: <span className="text-white font-medium">{timeframe}</span>
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 transition-colors rounded-md text-sm text-gray-400">
          Interval: <span className="text-white font-medium">{interval}</span>
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white">
          <LineChart className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white">
          <CandlestickChart className="w-5 h-5" />
        </button>
        <button className="p-2 ml-1 hover:bg-white/5 rounded-lg transition-colors text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14l6-6 4 4 6-6" />
            <path d="M14 6h6v6" />
            <path d="M4 4v16h16" />
            <path d="M12 16v4" />
            <path d="M8 12v8" />
            <path d="M16 10v10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
