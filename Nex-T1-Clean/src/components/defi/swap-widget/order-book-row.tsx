"use client";

import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderBookRowProps {
  pair: string;
  price: string;
  change: string;        // e.g. "+1.3%"
  changeSign: "+" | "-"; // positive or negative
  starred?: boolean;
  onStarToggle?: () => void;
  onClick?: () => void;
}

export function OrderBookRow({
  pair,
  price,
  change,
  changeSign,
  starred = false,
  onStarToggle,
  onClick,
}: OrderBookRowProps) {
  const isPositive = changeSign === "+";

  return (
    <div
      className="flex items-center justify-between px-4 py-[5px] hover:bg-white/[0.03] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Star + Pair */}
      <div className="flex items-center gap-[6px] min-w-[90px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle?.();
          }}
          className="flex-shrink-0"
        >
          <Star
            className={cn(
              "w-[11px] h-[11px] transition-colors",
              starred ? "fill-[#F5C518] text-[#F5C518]" : "fill-none text-gray-600 hover:text-gray-400"
            )}
          />
        </button>
        <span className="text-[11px] text-gray-200 font-mono">{pair}</span>
      </div>

      {/* Price */}
      <span className="text-[11px] text-white font-mono flex-1 text-center">{price}</span>

      {/* Change badge */}
      <div
        className={cn(
          "flex items-center gap-[3px] px-[5px] py-[2px] rounded-full min-w-[48px] justify-center",
          isPositive ? "bg-[#16a34a]/20" : "bg-[#dc2626]/20",
        )}
      >
        <div
          className={cn(
            "w-[10px] h-[10px] rounded-full flex items-center justify-center",
            isPositive ? "bg-[#22c55e]" : "bg-[#ef4444]"
          )}
        >
          <svg viewBox="0 0 6 6" className="w-[5px] h-[5px] fill-white">
            {isPositive
              ? <path d="M3 0.5L5.5 5.5H0.5L3 0.5Z" />
              : <path d="M3 5.5L0.5 0.5H5.5L3 5.5Z" />
            }
          </svg>
        </div>
        <span
          className={cn(
            "text-[10.5px] font-mono font-medium",
            isPositive ? "text-[#4ade80]" : "text-[#f87171]"
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
