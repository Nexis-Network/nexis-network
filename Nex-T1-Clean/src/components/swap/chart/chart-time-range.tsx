"use client";

import { cn } from "@/lib/utils";
import type { ChartRange } from "./use-chart-data";
import { ChevronDown, Maximize, BarChart2 } from "lucide-react";

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "1D", label: "1d" },
  { key: "7D", label: "7d" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
];

interface ChartTimeRangeProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  className?: string;
}

export function ChartTimeRange({ value, onChange, className }: ChartTimeRangeProps) {
  // In a real app we'd map `value` to an interval, for visual parity we hardcode "15m" for 1D.
  const interval = value === "1D" ? "15m" : value === "7D" ? "1h" : value === "1M" ? "4h" : "1d";
  const displayValue = RANGES.find(r => r.key === value)?.label || "1d";

  return (
    <div className={cn("flex flex-row items-center gap-[8px] h-[32px] w-auto whitespace-nowrap", className)}>
      
      {/* Timeframe Menu */}
      <button 
        className="box-border flex flex-row justify-between items-center pl-[12px] pr-[8px] gap-[4px] w-[131px] h-[32px] bg-[#141415] border border-[#26272d] rounded-[6px] transition-colors hover:bg-white/5"
        onClick={() => {
          // Simple cycle logic for demo to change ranges easily
          const idx = RANGES.findIndex(r => r.key === value);
          const next = RANGES[(idx + 1) % RANGES.length];
          onChange(next.key);
        }}
      >
        <div className="flex flex-row items-center gap-[4px] mx-auto w-[89px] h-[21px]">
          <span className="flex flex-col items-center w-[71px] h-[21px] text-[#ACADAE] font-inter text-[13.2px] leading-[21px]">
            Timeframe:
          </span>
          <span className="flex flex-col items-center w-[14px] h-[21px] text-white font-inter font-medium text-[12.5px] leading-[21px]">
            {displayValue}
          </span>
        </div>
        <ChevronDown className="w-[16px] h-[16px] text-white" />
      </button>

      {/* Interval Menu */}
      <button 
        className="box-border flex flex-row justify-between items-center pl-[12px] pr-[8px] gap-[4px] w-[123px] h-[32px] bg-[#141415] border border-[#26272d] rounded-[6px] transition-colors hover:bg-white/5 opacity-80 cursor-not-allowed"
      >
        <div className="flex flex-row items-center gap-[4px] mx-auto w-[81px] h-[21px]">
          <span className="flex flex-col items-center w-[51px] h-[21px] text-[#ACADAE] font-inter text-[13.3px] leading-[21px]">
            Interval:
          </span>
          <span className="flex flex-col items-center w-[26px] h-[21px] text-white font-inter font-medium text-[13px] leading-[21px]">
            {interval}
          </span>
        </div>
        <ChevronDown className="w-[16px] h-[16px] text-white" />
      </button>

      {/* Divider */}
      <div className="shrink-0 w-[1px] h-[24px] bg-[rgba(255,255,255,0.08)] mx-1" />

      {/* Action Icons */}
      <div className="inline-flex flex-row justify-center items-start w-[64px] h-[32px] rounded-[6px]">
        <button className="relative flex flex-row justify-center items-center p-[4px] w-[32px] h-[32px] rounded-[6px] bg-[#141415] border border-[#26272d] text-white hover:bg-white/5 transition-colors">
           <Maximize className="w-[16px] h-[16px]" />
        </button>
        <button className="relative flex flex-row justify-center items-center p-[4px] w-[32px] h-[32px] rounded-[6px] text-[#ACADAE] hover:text-white transition-colors">
          <BarChart2 className="w-[18px] h-[18px]" />
        </button>
      </div>

    </div>
  );
}
