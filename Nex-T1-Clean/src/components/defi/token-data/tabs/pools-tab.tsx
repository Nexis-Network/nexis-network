"use client";

import React, { useEffect, useState } from "react";
import { TokenInfo } from "@/stores/use-swap-store";
import { isNativeToken } from "@/modules/tokens/utils/asset-id";
import { CoingeckoTopPool } from "@/server/services/coingecko/coingecko-types";

const getNetworkId = (chainId: number) => {
  switch (chainId) {
    case 1: return "eth";
    case 137: return "polygon_pos";
    case 42161: return "arbitrum";
    case 8453: return "base";
    default: return "eth"; 
  }
};

export function PoolsTab({ token }: { token: TokenInfo }) {
  const [pools, setPools] = useState<CoingeckoTopPool["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPools = async () => {
      // Avoid fetching for the native eth wrapper placeholder
      if (isNativeToken(token)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const netId = getNetworkId(token.chainId);
        const res = await fetch(`/api/coingecko/pools?network=${netId}&address=${token.address}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (mounted && data.data) {
          setPools(data.data.slice(0, 10)); // Top 10 pools
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPools();
    return () => { mounted = false; };
  }, [token]);

  if (loading) return <div className="p-4 text-white/50 animate-pulse">Loading top pools...</div>;
  if (!pools || pools.length === 0) return <div className="p-4 text-white/50">No pool data available for this token.</div>;

  return (
    <div className="w-full overflow-x-auto text-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/60">
            <th className="p-3 font-normal">Pool / DEX</th>
            <th className="p-3 font-normal">Price</th>
            <th className="p-3 font-normal">24H Vol</th>
            <th className="p-3 font-normal">Reserve (USD)</th>
          </tr>
        </thead>
        <tbody className="text-white">
          {pools.map((p) => {
            const attr = p.attributes;
            const dexId = p.relationships.dex.data.id;
            return (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3 flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">{attr.name}</span>
                    <span className="text-xs text-white/50 uppercase">{dexId}</span>
                  </div>
                </td>
                <td className="p-3 font-mono">${parseFloat(attr.base_token_price_usd).toFixed(6)}</td>
                <td className="p-3 font-mono">${parseFloat(attr.volume_usd.h24 || "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="p-3 font-mono">${parseFloat(attr.reserve_in_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
