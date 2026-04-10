"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ArrowUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderBookRow } from "./order-book-row";
import { useSwapStore } from "@/stores/use-swap-store";

// ─── Static pair list (live-fetched below) ───────────────────────
const TRACKED_PAIRS = [
  { pair: "ETH/USDT", coinId: "ethereum" },
  { pair: "SOL/USDT", coinId: "solana" },
  { pair: "BTC/USDT", coinId: "bitcoin" },
  { pair: "AVAX/USDT", coinId: "avalanche-2" },
  { pair: "DOGE/USDT", coinId: "dogecoin" },
  { pair: "BNB/USDT", coinId: "binancecoin" },
];

interface PriceRow {
  pair: string;
  price: string;
  change: string;
  changeSign: "+" | "-";
  starred: boolean;
}

function usePairPrices() {
  const [rows, setRows] = useState<PriceRow[]>(
    TRACKED_PAIRS.map((p) => ({
      pair: p.pair,
      price: "...",
      change: "—",
      changeSign: "+" as const,
      starred: ["ETH/USDT", "SOL/USDT", "AVAX/USDT"].includes(p.pair),
    }))
  );

  useEffect(() => {
    let mounted = true;
    const ids = TRACKED_PAIRS.map((p) => p.coinId).join(",");

    async function fetch_prices() {
      try {
        const res = await fetch(
          `/api/proxy/coingecko/coins/markets?ids=${ids}&vs_currency=usd&price_change_percentage=24h`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !Array.isArray(data)) return;

        setRows(
          TRACKED_PAIRS.map((p) => {
            const coin = data.find(
              (c: { id: string; current_price?: number; price_change_percentage_24h?: number }) =>
                c.id === p.coinId
            );
            if (!coin) return { pair: p.pair, price: "—", change: "—", changeSign: "+" as const, starred: ["ETH/USDT", "SOL/USDT", "AVAX/USDT"].includes(p.pair) };

            const pct: number = coin.price_change_percentage_24h ?? 0;
            const sign: "+" | "-" = pct >= 0 ? "+" : "-";
            const price = coin.current_price < 1
              ? `$${coin.current_price.toFixed(4)}`
              : `$${coin.current_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return {
              pair: p.pair,
              price,
              change: `${sign}${Math.abs(pct).toFixed(1)}%`,
              changeSign: sign,
              starred: ["ETH/USDT", "SOL/USDT", "AVAX/USDT"].includes(p.pair),
            };
          })
        );
      } catch {
        // silently fail — stale data is fine
      }
    }

    fetch_prices();
    const interval = setInterval(fetch_prices, 120_000); // 2 min — conserve CoinGecko API credits
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { rows, setRows };
}

export function OrdersTradesPanel() {
  const [activeTab, setActiveTab] = useState<"orders" | "trades">("orders");
  const { rows, setRows } = usePairPrices();
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);

  const activePair = [sellToken?.symbol, buyToken?.symbol].filter(Boolean).join("/") || "ETH/USDT";

  const handleStarToggle = (pairName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.pair === pairName ? { ...r, starred: !r.starred } : r))
    );
  };

  return (
    <div className="flex flex-col border-t border-white/[0.06]">
      {/* Tabs */}
      <div className="mx-4 mt-3 mb-2 flex items-center bg-[#1A1A1A] rounded-lg p-[3px] gap-[2px]">
        {(["orders", "trades"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-[5px] rounded-md text-[11px] font-medium transition-colors",
              activeTab === tab
                ? "bg-[#252525] text-white"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            {tab === "orders" ? "Active Orders" : "Recent Trades"}
          </button>
        ))}
      </div>

      {/* Pair + amount selector */}
      <div className="flex items-center justify-between px-4 py-[5px]">
        <button className="flex items-center gap-[5px] text-[11px] text-gray-300 hover:text-white transition-colors">
          <span className="font-mono">{activePair}</span>
          <ChevronDown className="w-[10px] h-[10px] text-gray-500" />
        </button>
        <button className="flex items-center gap-[5px] text-[11px] text-gray-300 hover:text-white transition-colors">
          <span className="font-mono">0.001</span>
          <ChevronDown className="w-[10px] h-[10px] text-gray-500" />
        </button>
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between px-4 py-[4px]">
        <div className="flex items-center gap-[4px] min-w-[90px]">
          <span className="text-[10px] text-gray-500">Pairs</span>
          <ArrowUpDown className="w-[9px] h-[9px] text-gray-600" />
        </div>
        <div className="flex items-center gap-[4px] flex-1 justify-center">
          <span className="text-[10px] text-gray-500">Price</span>
          <Info className="w-[9px] h-[9px] text-gray-600" />
        </div>
        <div className="flex items-center gap-[4px] justify-end min-w-[60px]">
          <span className="text-[10px] text-gray-500">Change</span>
          <Info className="w-[9px] h-[9px] text-gray-600" />
        </div>
      </div>

      {/* Pair rows */}
      <div className="pb-1">
        {rows.map((row) => (
          <OrderBookRow
            key={row.pair}
            pair={row.pair}
            price={row.price}
            change={row.change}
            changeSign={row.changeSign}
            starred={row.starred}
            onStarToggle={() => handleStarToggle(row.pair)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-4 pb-3 pt-1 border-t border-white/[0.04]">
        <span className="text-[10px] text-gray-600 font-mono">
          O: 63,980.12&nbsp;&nbsp;L: 65,442.91
        </span>
      </div>
    </div>
  );
}
