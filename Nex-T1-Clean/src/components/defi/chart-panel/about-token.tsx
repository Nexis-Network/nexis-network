"use client";

import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwapStore } from "@/stores/use-swap-store";
import { symbolToCoinId } from "@/components/swap/chart/use-chart-data";

interface AboutTokenProps {
  className?: string;
}

export function AboutToken({ className }: AboutTokenProps) {
  const sellToken = useSwapStore((s) => s.sellToken);
  const [description, setDescription] = useState<string>("Loading description...");

  useEffect(() => {
    async function fetchDescription() {
      if (!sellToken?.symbol) return;
      
      const coinId = symbolToCoinId(sellToken.symbol);
      if (!coinId) {
        setDescription(`No description available for ${sellToken.symbol}.`);
        return;
      }
      
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        if (data.description?.en) {
          setDescription(data.description.en);
        } else {
          setDescription(`No description available for ${sellToken.symbol}.`);
        }
      } catch (err) {
        console.warn("[AboutToken] Error fetching description:", err);
        setDescription(`Could not load description for ${sellToken.name}.`);
      }
    }
    
    fetchDescription();
  }, [sellToken]);

  return (
    <div className={cn("flex flex-col gap-4 w-full border-t border-white/5 pt-6 mt-6", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-white">About {sellToken?.symbol || "TRENCH"}</h2>
        <Info className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white transition-colors" />
      </div>
      
      <div 
        className="text-sm text-gray-400 leading-relaxed max-w-3xl prose prose-invert prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
}
