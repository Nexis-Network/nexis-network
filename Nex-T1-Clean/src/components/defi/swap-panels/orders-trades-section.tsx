"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useSwapStore } from "@/stores/use-swap-store";
import { useOnchainTradeStream } from "@/hooks/use-onchain-trade-stream";
import { cn } from "@/lib/utils";
import { ChevronDown, Star, ArrowUpDown, Info } from "lucide-react";

// ─── Lazy-load Asset Performance tab content ─────────────────────
const AssetPerformancePanel = dynamic(
  () => import("@/components/defi/swap-panels/asset-performance-panel").then((m) => m.AssetPerformancePanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#0ea5e9]" />
      </div>
    ),
  }
);

// ─── Well-known DEX pool addresses for OnchainTrade WS ──────────
const ONCHAIN_TRADE_POOLS = [
  "eth:0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", // ETH/USDC 0.05%
  "eth:0x11b815efb8f581194ae79006d24e0d814b7697f6", // ETH/USDT 0.05%
  "eth:0xcbcdf9626bc03e24f779434178a73a0b4bad62ed", // WBTC/ETH 0.3%
  "eth:0x4e68ccd3e89f51c3074ca5072bbac773960dfa36", // ETH/USDT 0.3%
];

// ─── Pair price row (for the order book section) ─────────────────
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
}

type CoinMarketEntry = {
  id: string;
  current_price?: number;
  price_change_percentage_24h?: number;
};

const PAIR_PRICE_IDS = TRACKED_PAIRS.map((p) => p.coinId).join(",");

async function fetchPairPrices(): Promise<PriceRow[]> {
  const res = await fetch(
    `/api/proxy/coingecko/coins/markets?ids=${PAIR_PRICE_IDS}&vs_currency=usd&price_change_percentage=24h`,
  );
  if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);
  const data: CoinMarketEntry[] = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid CoinGecko markets response");

  return TRACKED_PAIRS.map((p) => {
    const coin = data.find((c) => c.id === p.coinId);
    if (!coin) return { pair: p.pair, price: "—", change: "—", changeSign: "+" as const };

    const pct: number = coin.price_change_percentage_24h ?? 0;
    const sign: "+" | "-" = pct >= 0 ? "+" : "-";
    const price =
      coin.current_price != null && coin.current_price < 1
        ? `$${coin.current_price.toFixed(4)}`
        : `$${(coin.current_price ?? 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;

    return {
      pair: p.pair,
      price,
      change: `${sign}${Math.abs(pct).toFixed(1)}%`,
      changeSign: sign,
    };
  });
}

const DEFAULT_ROWS: PriceRow[] = TRACKED_PAIRS.map((p) => ({
  pair: p.pair,
  price: "...",
  change: "—",
  changeSign: "+" as const,
}));

const DEFAULT_STARRED = new Set(["ETH/USDT", "SOL/USDT", "AVAX/USDT", "BNB/USDT"]);

// ─── Tab type ────────────────────────────────────────────────────
type SectionTab = "orders" | "trades" | "performance";

// ─── Main component ──────────────────────────────────────────────
export function OrdersTradesSection() {
  const sellToken = useSwapStore((s) => s.sellToken);
  const buyToken = useSwapStore((s) => s.buyToken);
  const [activeTab, setActiveTab] = useState<SectionTab>("orders");
  const [starredPairs, setStarredPairs] = useState<Set<string>>(DEFAULT_STARRED);

  // React Query replaces raw setInterval — provides dedup, staleTime, background refetch
  const { data: pairRows = DEFAULT_ROWS } = useQuery({
    queryKey: ["pair-prices", PAIR_PRICE_IDS],
    queryFn: fetchPairPrices,
    staleTime: 120_000,      // 2 min — data considered fresh
    refetchInterval: 120_000, // 2 min — matches previous setInterval
    gcTime: 300_000,          // 5 min — keep in cache after unmount
  });

  const { trades: recentTrades, isConnected: isTradeStreamConnected } = useOnchainTradeStream({
    pools: ONCHAIN_TRADE_POOLS,
    maxTrades: 20,
    enabled: activeTab === "trades",
  });

  const handleStarToggle = (pairName: string) => {
    setStarredPairs((prev) => {
      const next = new Set(prev);
      if (next.has(pairName)) next.delete(pairName);
      else next.add(pairName);
      return next;
    });
  };

  const displayTrades = useMemo(() =>
    recentTrades.slice(0, 6).map((t) => {
      const priceStr = t.priceUsd >= 1
        ? `$${t.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${t.priceUsd.toFixed(4)}`;
      const volStr = t.volumeUsd >= 1000
        ? `$${(t.volumeUsd / 1000).toFixed(1)}K`
        : `$${t.volumeUsd.toFixed(0)}`;
      const timeStr = new Date(t.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      return { ...t, priceStr, volStr, timeStr };
    }),
    [recentTrades],
  );

  const TAB_OPTIONS: { key: SectionTab; label: string }[] = [
    { key: "orders", label: "Active Orders" },
    { key: "trades", label: "Recent Trades" },
    { key: "performance", label: "Asset Performance" },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F0F10]">
      {/* Tab selector — scrollable on very narrow screens */}
      <div className="mx-2 sm:mx-4 mt-4 mb-2 flex items-center bg-[#1A1A1A] rounded-lg p-[3px] gap-[2px] overflow-x-auto no-scrollbar">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 shrink-0 py-[5px] rounded-md text-[10px] sm:text-[11px] font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key ? "bg-[#252525] text-white" : "text-gray-400 hover:text-gray-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "orders" && (
        <>
          {/* Pair + amount selector */}
          <div className="flex items-center justify-between px-4 py-[5px]">
            <button className="flex items-center gap-[5px] text-[11px] text-gray-300 hover:text-white transition-colors">
              <span className="font-mono">{sellToken?.symbol || "ETH"}/{buyToken?.symbol || "USDT"}</span>
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
            {pairRows.map((row) => {
              const isPositive = row.changeSign === "+";
              return (
                <div
                  key={row.pair}
                  className="flex items-center justify-between px-4 py-[5px] hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-[6px] min-w-[90px]">
                    <button
                      onClick={() => handleStarToggle(row.pair)}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={cn(
                          "w-[11px] h-[11px] transition-colors",
                          starredPairs.has(row.pair) ? "fill-[#F5C518] text-[#F5C518]" : "fill-none text-gray-600 hover:text-gray-400"
                        )}
                      />
                    </button>
                    <span className="text-[11px] text-gray-200 font-mono">{row.pair}</span>
                  </div>
                  <span className="text-[11px] text-white font-mono flex-1 text-center">{row.price}</span>
                  <div
                    className={cn(
                      "flex items-center gap-[3px] px-[5px] py-[2px] rounded-full min-w-[48px] justify-center",
                      isPositive ? "bg-[#16a34a]/20" : "bg-[#dc2626]/20"
                    )}
                  >
                    <div
                      className={cn(
                        "w-[10px] h-[10px] rounded-full flex items-center justify-center",
                        isPositive ? "bg-[#22c55e]" : "bg-[#ef4444]"
                      )}
                    >
                      <svg viewBox="0 0 6 6" className="w-[5px] h-[5px] fill-white">
                        {isPositive ? (
                          <path d="M3 0.5L5.5 5.5H0.5L3 0.5Z" />
                        ) : (
                          <path d="M3 5.5L0.5 0.5H5.5L3 5.5Z" />
                        )}
                      </svg>
                    </div>
                    <span
                      className={cn(
                        "text-[10.5px] font-mono font-medium",
                        isPositive ? "text-[#4ade80]" : "text-[#f87171]"
                      )}
                    >
                      {row.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 pb-3 pt-1 border-t border-white/[0.04]">
            <span className="text-[10px] text-gray-600 font-mono">O: 63,980.12&nbsp;&nbsp;L: 65,442.91</span>
          </div>
        </>
      )}

      {activeTab === "trades" && (
        <>
          {/* Recent Trades — real-time via CoinGecko OnchainTrade WS */}
          <div className="flex items-center justify-between px-4 py-[5px]">
            <div className="flex items-center gap-[6px]">
              <div className={cn(
                "h-[6px] w-[6px] rounded-full",
                isTradeStreamConnected ? "bg-[#22c55e] animate-pulse" : "bg-gray-600"
              )} />
              <span className="text-[10px] text-gray-500">
                {isTradeStreamConnected ? "Live" : "Connecting..."}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">Uniswap V3 / Ethereum</span>
          </div>

          {/* Trade table header */}
          <div className="flex items-center justify-between px-4 py-[4px]">
            <span className="text-[10px] text-gray-500 min-w-[44px]">Type</span>
            <span className="text-[10px] text-gray-500 flex-1 text-center">Price</span>
            <span className="text-[10px] text-gray-500 min-w-[48px] text-center">Vol</span>
            <span className="text-[10px] text-gray-500 min-w-[56px] text-right">Time</span>
          </div>

          {/* Trade rows */}
          <div className="pb-1">
            {displayTrades.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span className="text-[11px] text-gray-600">
                  {isTradeStreamConnected ? "Waiting for trades..." : "Connecting to stream..."}
                </span>
              </div>
            ) : (
              displayTrades.map((trade, i) => {
                const isBuy = trade.type === "buy";
                return (
                  <div
                    key={`${trade.txHash}-${i}`}
                    className="flex items-center justify-between px-4 py-[5px] hover:bg-white/[0.03] transition-colors"
                  >
                    <div className={cn(
                      "text-[10px] font-mono font-medium min-w-[44px] uppercase",
                      isBuy ? "text-[#4ade80]" : "text-[#f87171]"
                    )}>
                      {trade.type}
                    </div>
                    <span className="text-[11px] text-white font-mono flex-1 text-center">
                      {trade.priceStr}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono min-w-[48px] text-center">
                      {trade.volStr}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono min-w-[56px] text-right">
                      {trade.timeStr}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-white/[0.04]">
            <span className="text-[10px] text-gray-600">{recentTrades.length} trades received</span>
            <span className="text-[10px] text-gray-600 font-mono">wss://stream.coingecko.com</span>
          </div>
        </>
      )}

      {activeTab === "performance" && (
        <div className="px-2 pb-2">
          <AssetPerformancePanel />
        </div>
      )}
    </div>
  );
}
