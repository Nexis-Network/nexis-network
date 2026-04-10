"use client";

import React from "react";
import Image from "next/image";
import { Star, Copy, Layers, Globe, X, MoreHorizontal, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useSwapStore } from "@/stores/use-swap-store";
import { useLiveAsset } from "@/hooks/use-live-asset";
import { useChainId } from "wagmi";

export function TokenHeader() {
  const sellToken = useSwapStore((s) => s.sellToken);
  const chainId = useChainId();

  const tokenSymbol = sellToken?.symbol || "ETH";
  const tokenName = sellToken?.name || "Ethereum";
  const tokenLogo = sellToken?.logoURI;

  const { price, change24h } = useLiveAsset(
    tokenSymbol,
    0,
    chainId.toString()
  );

  const isPositive = change24h >= 0;
  const formattedPrice = price > 0 ? (price < 0.01 ? price.toFixed(6) : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })) : "0.00";
  const formattedChange = Math.abs(change24h).toFixed(2);
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Row: Avatar, Name, Badges, Icons */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden">
          {tokenLogo ? (
            <Image src={tokenLogo} alt={tokenSymbol} width={40} height={40} className="object-cover" />
          ) : (
            <span className="text-white text-[10px] font-bold">{tokenSymbol.slice(0, 4)}</span>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-white">{tokenName}</h1>
            <span className="text-gray-400 font-medium">{tokenSymbol}</span>
            <Star className="w-4 h-4 text-gray-400 ml-1" />
            
            <div className="flex items-center gap-3 ml-2 text-gray-400">
              <Copy className="w-4 h-4 hover:text-white cursor-pointer" />
              <Layers className="w-4 h-4 hover:text-white cursor-pointer" />
              <Globe className="w-4 h-4 hover:text-white cursor-pointer" />
              <X className="w-4 h-4 hover:text-white cursor-pointer" />
              <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider bg-transparent border border-white/10 text-gray-300">TOKEN</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider bg-transparent border border-white/10 text-gray-300 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              SOLANA
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider bg-transparent border border-white/10 text-gray-300">1 WEEK AGO</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Price, Change, FDV, Date */}
      <div className="flex flex-col mt-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[32px] font-medium text-white">${formattedPrice}</span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {formattedChange}%
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
          <span>FDV: <span className="text-white font-medium">$2.1M</span></span>
          <span className="text-gray-600">|</span>
          <span>Feb 21, 2026, 3:45 PM</span>
        </div>
      </div>
    </div>
  );
}
