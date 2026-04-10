"use client";

import React, { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ChartDataPoint = {
    timestamp: number;
    price: number;
};

type NativeChartProps = {
    symbol: string; // e.g., "BINANCE:BTCUSDT" -> we need to extract "bitcoin" or similar ID
    coinId?: string; // Optional explicit coin ID override
    className?: string;
};

// Helper to map symbol to coinId if not provided
// This is a basic mapping; in a real app, you might pass the coinId directly from the parent
function mapSymbolToId(symbol: string): string {
    const s = symbol.toLowerCase();
    if (s.includes("btc")) return "bitcoin";
    if (s.includes("eth")) return "ethereum";
    if (s.includes("sol")) return "solana";
    if (s.includes("nex")) return "nexis-network";
    if (s.includes("xrp")) return "ripple";
    if (s.includes("ada")) return "cardano";
    if (s.includes("avax")) return "avalanche-2";
    if (s.includes("dot")) return "polkadot";
    if (s.includes("link")) return "chainlink";
    if (s.includes("doge")) return "dogecoin";
    return "bitcoin"; // Default fallback
}

export function NativeChart({ symbol, coinId, className }: NativeChartProps) {
    const [data, _setData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const id = coinId || mapSymbolToId(symbol);

    useEffect(() => {
        let mounted = true;

        async function fetchData() {
            // API route removed. Disabling fetch to prevent 502 errors.
            if (mounted) {
                setError("Chart data currently unavailable");
                setLoading(false);
            }
            /*
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(
                    `/api/analytics/market-overview/coins/${id}/chart`
                );

                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error("Chart data pending ingestion");
                    }
                    throw new Error("Failed to load chart data");
                }

                const json = await res.json();
                // CoinGecko returns [timestamp, price][]
                const prices = json.prices || [];
                const formatted = prices.map((p: [number, number]) => ({
                    timestamp: p[0],
                    price: p[1],
                }));

                if (mounted) {
                    setData(formatted);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : "Unknown error");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
            */
        }

        fetchData();

        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className={cn("flex h-full w-full items-center justify-center", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex h-full w-full items-center justify-center text-sm text-muted-foreground", className)}>
                {error === "Chart data pending ingestion" ? (
                    <div className="text-center">
                        <p>Chart data is initializing.</p>
                        <p className="text-xs opacity-70">Please check back in a few minutes.</p>
                    </div>
                ) : (
                    <p>Unable to load chart</p>
                )}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={cn("flex h-full w-full items-center justify-center text-sm text-muted-foreground", className)}>
                No data available
            </div>
        );
    }

    const minPrice = Math.min(...data.map((d) => d.price));
    const maxPrice = Math.max(...data.map((d) => d.price));

    return (
        <div className={cn("h-full w-full", className)}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="timestamp"
                        hide
                        type="number"
                        domain={["dataMin", "dataMax"]}
                    />
                    <YAxis
                        hide
                        domain={[minPrice * 0.99, maxPrice * 1.01]}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const price = payload[0].value as number;
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <p className="font-mono text-sm font-medium">
                                            ${price.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="linear"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
