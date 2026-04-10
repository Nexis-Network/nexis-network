"use client";

import React from "react";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SwapInputBlockProps {
  label: string;
  value: string;
  onChange?: (val: string) => void;
  tokenSymbol: string;
  tokenLogoUrl?: string;
  usdValue: string;
  balance?: string;
  isReceive?: boolean;
}

export function SwapInputBlock({
  label,
  value,
  onChange,
  tokenSymbol,
  tokenLogoUrl,
  usdValue,
  balance,
  isReceive,
}: SwapInputBlockProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#131313] border border-white/5 w-full">
      <span className="text-sm text-gray-400 font-medium">{label}</span>
      
      <div className="flex flex-row items-center justify-between mt-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={isReceive ? "—" : "0"}
          className={cn(
            "bg-transparent border-none outline-none font-mono text-4xl w-[60%] text-white placeholder:text-gray-500",
            isReceive && !value ? "opacity-50" : ""
          )}
          readOnly={isReceive}
        />

        <button className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#222] transition-colors border border-white/10 rounded-full px-3 py-1.5 shrink-0">
          {tokenLogoUrl ? (
            <div className="relative w-6 h-6 rounded-full overflow-hidden">
              <Image src={tokenLogoUrl} alt={tokenSymbol} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-[10px] text-blue-400 font-bold">{tokenSymbol.slice(0, 1)}</span>
            </div>
          )}
          <span className="text-white font-medium ml-1">{tokenSymbol}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex flex-row items-center justify-between mt-2 text-sm text-gray-400">
        <span className="flex items-center justify-center gap-1 font-mono">
          {usdValue}
          {!isReceive && <ArrowUpDown className="w-3 h-3 ml-1 cursor-pointer hover:text-white" />}
        </span>
        {balance && (
          <span className="font-mono">
            {balance} <span className="text-gray-500 font-sans">{tokenSymbol}</span>
          </span>
        )}
      </div>
    </div>
  );
}
