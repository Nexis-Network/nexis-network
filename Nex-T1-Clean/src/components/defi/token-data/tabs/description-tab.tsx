"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { TokenInfo } from "@/stores/use-swap-store";
import { CoingeckoTokenInfo } from "@/server/services/coingecko/coingecko-types";

const getPlatformId = (chainId: number) => {
  switch (chainId) {
    case 1: return "ethereum";
    case 137: return "polygon-pos";
    case 42161: return "arbitrum-one";
    case 8453: return "base";
    default: return "ethereum"; 
  }
};

export function DescriptionTab({ token }: { token: TokenInfo }) {
  const [info, setInfo] = useState<CoingeckoTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const platform = getPlatformId(token.chainId);
        const res = await fetch(`/api/coingecko/token?network=${platform}&address=${token.address}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (mounted && data.id) {
          setInfo(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchInfo();
    return () => { mounted = false; };
  }, [token]);

  if (loading) return <div className="p-4 text-white/50 animate-pulse">Loading token description...</div>;
  if (!info) return <div className="p-4 text-white/50">Details unavailable for this token.</div>;

  const desc = info.description?.en ? info.description.en.replace(/<[^>]+>/g, '') : "No description available.";
  const priceChange = info.market_data?.price_change_percentage_24h || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="flex flex-col md:flex-row gap-6 text-sm text-white">
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-4">
          {(info.image?.large || token.logoURI) ? (
            <Image src={info.image?.large || token.logoURI!} alt={info.name} width={64} height={64} className="rounded-full bg-white/10" unoptimized />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-lg font-bold uppercase text-white">
              {(info.symbol ?? info.name ?? "?").slice(0, 2)}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{info.name} ({info.symbol.toUpperCase()})</h2>
            <div className={`text-lg font-mono ${isPositive ? "text-[#47bb64]" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{priceChange.toFixed(2)}% (24H)
            </div>
          </div>
        </div>
        <p className="text-white/70 leading-relaxed text-sm max-w-2xl bg-white/5 p-4 rounded-xl border border-white/10">
          {desc}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 h-fit">
        <div className="bg-[#141415] border border-[#26272d] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-white/60 text-xs uppercase tracking-wider">FDV</span>
          <span className="font-mono text-lg">${(info.market_data?.fully_diluted_valuation?.usd || 0).toLocaleString()}</span>
        </div>
        <div className="bg-[#141415] border border-[#26272d] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-white/60 text-xs uppercase tracking-wider">24H Volume</span>
          <span className="font-mono text-lg">${(info.market_data?.total_volume?.usd || 0).toLocaleString()}</span>
        </div>
        <div className="bg-[#141415] border border-[#26272d] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-white/60 text-xs uppercase tracking-wider">Market Cap</span>
          <span className="font-mono text-lg">${(info.market_data?.market_cap?.usd || 0).toLocaleString()}</span>
        </div>
        <div className="bg-[#141415] border border-[#26272d] rounded-xl p-4 flex flex-col gap-1">
          <span className="text-white/60 text-xs uppercase tracking-wider">Circulating Supply</span>
          <span className="font-mono text-lg">{(info.market_data?.circulating_supply || 0).toLocaleString()} {info.symbol.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
