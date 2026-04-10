"use client";

import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

// Chain Data
const CHAINS = [
  { name: "Ethereum", logo: LIQUID_GLASS_LOGOS.ethereum, color: "#627EEA" },
  { name: "Arbitrum", logo: "/icons/chain-icons/arbitrum.svg", color: "#12AAFF" },
  { name: "Base", logo: "/icons/chain-icons/base.svg", color: "#0052FF" },
  { name: "BNB Chain", logo: LIQUID_GLASS_LOGOS.bnb, color: "#F3BA2F" },
  { name: "Optimism", logo: "/icons/chain-icons/optimism.svg", color: "#FF0420" },
  { name: "Solana", logo: LIQUID_GLASS_LOGOS.solana, color: "#9945FF" },
  { name: "Bitcoin", logo: LIQUID_GLASS_LOGOS.bitcoin, color: "#F7931A" },
  { name: "Near", logo: "/icons/chain-icons/aurora.svg", color: "#00C1DE" }, // Using Aurora as Near ecosystem rep
  { name: "Polygon", logo: "/icons/chain-icons/polygon.svg", color: "#8247E5" },
  { name: "Hyperliquid", logo: LIQUID_GLASS_LOGOS.hyperliquid, color: "#00FF00" },
];

const TickerItem = ({ 
  item, 
}: { 
  item: typeof CHAINS[0], 
}) => {
  return (
    <div className="group flex items-center gap-3 px-2 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-pointer">
      <div 
        className={cn(
          "relative w-5 h-5 transition-all duration-300",
          "filter grayscale brightness-200 group-hover:filter-none group-hover:brightness-100"
        )}
      >
        <Image
          src={item.logo}
          alt={item.name}
          fill
          sizes="40px"
          className="object-contain"
        />
      </div>
      <span 
        className="text-[11px] font-mono font-medium transition-colors duration-300"
        style={{
           "--hover-color": item.color
        } as React.CSSProperties}
      >
        <span className="group-hover:text-[var(--hover-color)] text-[#f4f4f4]">
          {item.name}
        </span>
      </span>
    </div>
  );
};

const TickerLine = ({ 
  items, 
  direction = "left", 
  speed = 40 
}: { 
  items: typeof CHAINS, 
  direction?: "left" | "right", 
  speed?: number 
}) => {
  return (
    <div className="flex w-full overflow-hidden select-none py-3">
      <div 
        className={cn(
          "flex min-w-full shrink-0 items-center gap-10 md:gap-[80px]", // Increased gap for better separation
          direction === "left" ? "animate-infinite-scroll" : "animate-infinite-scroll-reverse"
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {/* 4 Sets to ensure seamless loop on even the widest screens */}
        {[...items, ...items, ...items, ...items].map((chain, idx) => (
           <TickerItem key={`${chain.name}-${idx}`} item={chain} />
        ))}
      </div>
    </div>
  );
};

export function LandingV2Ticker() {
  return (
    <div className="relative flex flex-col justify-center items-center w-full h-[80px] z-[1] overflow-hidden bg-[#0f0f10]/0">
      
        {/* Gradients */}
       <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none z-10">
         <div 
            className="absolute left-0 top-0 bottom-0 w-[200px] z-20"
            style={{
                background: "linear-gradient(90deg, #0f0f10 0%, rgba(15,15,16,0) 100%)"
            }} 
         />
         <div 
            className="absolute right-0 top-0 bottom-0 w-[200px] z-20"
            style={{
                background: "linear-gradient(270deg, #0f0f10 0%, rgba(15,15,16,0) 100%)"
            }} 
         />
      </div>

      <div className="flex flex-col w-full">
         <TickerLine items={CHAINS} direction="left" speed={60} />
      </div>

      <style jsx global>{`
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); } /* Move by 1/4th (1 set out of 4) */
        }
        @keyframes infinite-scroll-reverse {
          from { transform: translateX(-25%); }
          to { transform: translateX(0); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll linear infinite;
        }
        .animate-infinite-scroll-reverse {
          animation: infinite-scroll-reverse linear infinite;
        }
      `}</style>
    </div>
  );
}
