"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChartTimeRange } from "./chart-time-range";
import type { ChartRange } from "./use-chart-data";
import { Globe, Twitter } from "lucide-react";
import type { TokenInfo } from "@/stores/use-swap-store";

interface ChartHeaderProps {
  currentPrice: number | null;
  priceChangePct: number;
  isPositive: boolean;
  rangeLabel: string;
  isLoading: boolean;
  token?: TokenInfo | null;
  timeRange: ChartRange;
  onTimeRangeChange: (range: ChartRange) => void;
  className?: string;
}

export function ChartHeader({
  currentPrice,
  priceChangePct,
  isPositive,
  isLoading,
  token,
  timeRange,
  onTimeRangeChange,
  className,
}: ChartHeaderProps) {
  const priceDisplay = currentPrice != null ? `$${currentPrice.toLocaleString("en-US", { maximumSignificantDigits: 8 })}` : "—";
  
  const pctStr = Math.abs(priceChangePct).toFixed(1);
  const sign = isPositive ? "+" : "";

  return (
    <div className={cn("flex flex-col items-start gap-[12px] w-[707.33px] h-[161px] font-sans", className)}>
      
      {/* 1. Top Token Header Info */}
      <div className="flex flex-row items-center gap-[16px] w-[707.33px] h-[64px]">
        {/* Token Image */}
        <div className="relative flex justify-center items-center w-[64px] h-[64px] rounded-[16777216px] border border-white/10 bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden shrink-0">
          {token?.logoURI ? (
            <Image src={token.logoURI} alt="token" width={64} height={64} className="absolute object-cover rounded-full z-0" unoptimized />
          ) : (
             <div className="absolute w-[64px] h-[64px] rounded-full bg-white/10 z-0" />
          )}
          <div className="absolute inset-0 bg-[rgba(255,255,255,0.002)] pointer-events-none z-10" />
        </div>

        {/* Info Rows */}
        <div className="flex flex-col items-start gap-[4px] w-[468px] h-[54px] shrink-0">
          {/* Title Row */}
          <div className="flex flex-row items-center gap-[16px] w-[468px] h-[32px]">
            <div className="flex flex-row items-center gap-[8px] h-[30px]">
              <h1 className="flex flex-row items-center justify-center content-center text-[18.9px] leading-[30px] text-white font-sans font-normal h-[30px]">
                {token?.name || "Trenches Game"} <span className="ml-[6px] text-[#ACADAE] text-[19.5px] uppercase">{token?.symbol || "TRENCH"}</span>
              </h1>
            </div>
            
            {/* Divider */}
            <div className="shrink-0 w-[2px] h-[24px] bg-[rgba(255,255,255,0.08)]" />
            
            {/* Socials */}
            <div className="flex flex-row items-center gap-[20px] h-[20px] w-[180px]">
              <a className="relative flex flex-col items-start w-[20px] h-[20px] text-white hover:text-white/80 transition-colors justify-center content-center" href="#">
                <Globe className="w-[16px] h-[16px] mx-auto my-auto" />
              </a>
              <a className="relative flex flex-col items-start w-[20px] h-[20px] text-white hover:text-white/80 transition-colors justify-center content-center" href="#">
                <Twitter className="w-[16px] h-[16px] mx-auto my-auto" />
              </a>
            </div>
          </div>
          
          {/* Badges Row */}
          <div className="flex flex-row items-center gap-[8px] w-[468px] h-[18px]">
            <div className="box-border flex flex-row items-center justify-center px-[6px] py-[4px] h-[20px] bg-[#141415] border border-[#26272D] rounded-[4px] text-white uppercase text-[12px] leading-[18px] font-mono font-normal">
              Token
            </div>
            {token?.chainId && (
              <div className="flex flex-col items-start h-[20px] cursor-pointer">
                <div className="box-border flex flex-row items-center px-[6px] py-[4px] gap-[4.5px] h-[20px] bg-[#141415] border border-[#26272D] rounded-[4px]">
                   <span className="text-white uppercase font-mono font-normal text-[12px] leading-[18px]">
                     {token.chainId === 1 ? 'Ethereum' : token.chainId === 8453 ? 'Base' : token.chainId === 137 ? 'Polygon' : token.chainId === 42161 ? 'Arbitrum' : `Chain ${token.chainId}`}
                   </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Block (Price & Ranges) */}
      <div className="flex flex-col items-start gap-[12px] w-[707.33px] h-[73px]">
        <div className="flex flex-row justify-between items-center w-[707.33px] h-[40px] pr-[0.1px]">
          {/* Left Price Block */}
          <div className="flex flex-row items-center gap-[16px] h-[40px] w-[260px]">
            <div className="inline-flex flex-row items-start h-[40px] shrink-0">
              <span className="flex flex-col items-start h-[40px] tabular-nums shrink-0">
                {isLoading ? (
                  <div className="h-[40px] w-[174px] bg-white/5 animate-pulse rounded-md" />
                ) : (
                  <span className="flex items-center text-white text-[32px] leading-[40px] font-mono font-normal w-full truncate">
                    {priceDisplay}
                  </span>
                )}
              </span>
            </div>

            {!isLoading && currentPrice != null && (
              <div className={cn(
                "flex flex-row items-center px-[8px] py-[2px] gap-[6px] h-[28px] rounded-[16777216px] shrink-0",
                isPositive ? "bg-[rgba(71,187,100,0.08)] text-[#47BB64]" : "bg-[rgba(255,68,68,0.08)] text-[#ff4444]"
              )}>
                <span className="font-mono font-normal text-[16px] leading-[24px]">
                  {sign}{pctStr}%
                </span>
              </div>
            )}
          </div>
          
          {/* Right Selectors Block */}
          <div className="flex flex-row flex-wrap justify-end items-center content-end gap-[0_12px] pl-[76.83px] w-[427.83px] h-[32px] mx-auto">
             <ChartTimeRange value={timeRange} onChange={onTimeRangeChange} />
          </div>
        </div>
        
        {/* 3. Bottom Extra Metrics */}
        <div className="flex flex-row items-center w-[707.33px] h-[21px]">
          <div className="flex flex-row items-center gap-[8px] h-[21px] w-[235px]">
             {/* Example FDV */}
             <button className="flex flex-row items-center gap-[8px] h-[21px] w-[87px]">
               <div className="flex flex-row items-center gap-[4px] w-[78px] h-[21px]">
                 <span className="flex flex-col items-center text-[#ACADAE] font-sans font-normal text-[13.9px] leading-[21px] text-center w-[31px]">FDV:</span>
                 <span className="flex flex-col items-center text-white font-mono font-normal text-[14px] leading-[21px] text-center w-[43px]">$2.1M</span>
               </div>
             </button>
             
             {/* Divider */}
             <div className="shrink-0 w-[1px] h-[16px] bg-[rgba(255,255,255,0.08)]" />
             
             {/* Time */}
             <span className="flex flex-col items-start w-auto whitespace-nowrap text-[#ACADAE] font-sans font-normal text-[13.2px] leading-[21px]">
               {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
             </span>
          </div>
        </div>
      </div>

    </div>
  );
}
