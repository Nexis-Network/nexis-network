"use client";

import React, { useEffect, useState } from "react";
import { TokenInfo } from "@/stores/use-swap-store";
import { isNativeToken } from "@/modules/tokens/utils/asset-id";
import { CoingeckoTrades } from "@/server/services/coingecko/coingecko-types";

// Helper to deduce network for GeckoTerminal
const getNetworkId = (chainId: number) => {
  switch (chainId) {
    case 1: return "eth";
    case 137: return "polygon_pos";
    case 42161: return "arbitrum";
    case 8453: return "base";
    // For Solana typically 101 or 1399811149, gecko uses 'solana'
    default: return "eth"; 
  }
};

export function TransactionsTab({ token }: { token: TokenInfo }) {
  const [trades, setTrades] = useState<CoingeckoTrades["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTrades = async () => {
      // Avoid fetching for the native eth wrapper placeholder, as GT will return 404 and spam 429
      if (isNativeToken(token)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const netId = getNetworkId(token.chainId);
        // We use token address as a proxy for pool address in this simplistic logic,
        // ideally we fetch pools first, then fetch trades for the top pool.
        const res = await fetch(`/api/coingecko/trades?network=${netId}&poolAddress=${token.address}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (mounted && data.data) {
          setTrades(data.data.slice(0, 10)); // Just top 10 for UI
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTrades();
    return () => { mounted = false; };
  }, [token]);

  if (loading) return <div className="p-4 text-white/50 animate-pulse">Loading recent trades...</div>;
  if (!trades || trades.length === 0) return <div className="p-4 text-white/50">No recent trades found for this pair.</div>;

  return (
    <div className="w-full overflow-x-auto text-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-white/60">
            <th className="p-3 font-normal">Time</th>
            <th className="p-3 font-normal">Type</th>
            <th className="p-3 font-normal">Price (USD)</th>
            <th className="p-3 font-normal">Amount</th>
            <th className="p-3 font-normal">Total (USD)</th>
          </tr>
        </thead>
        <tbody className="text-white">
          {trades.map((t) => {
            const isBuy = t.attributes.kind === "buy";
            const date = new Date(t.attributes.block_timestamp).toLocaleTimeString();
            return (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3">{date}</td>
                <td className={`p-3 font-medium ${isBuy ? "text-[#47bb64]" : "text-red-400"}`}>
                  {isBuy ? "Buy" : "Sell"}
                </td>
                <td className="p-3 font-mono">${parseFloat(t.attributes.price_from_in_usd).toFixed(6)}</td>
                <td className="p-3 font-mono">{parseFloat(t.attributes.from_token_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                <td className="p-3 font-mono">${parseFloat(t.attributes.volume_in_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
