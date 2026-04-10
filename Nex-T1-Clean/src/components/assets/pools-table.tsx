"use client";

import { TokenPair } from "@/types/market";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { ExternalLink, Droplets } from "lucide-react";
import Image from "next/image";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

interface PoolsTableProps {
    pools: TokenPair[];
    symbol: string;
    tokenLogoUrl?: string;
}

/**
 * Maps DEX names to their logo file paths in public/assets/exchanges
 */
function getDexLogoPath(dex: string | undefined): string | null {
    if (!dex) return null;
    
    const dexLower = dex.toLowerCase().trim();
    
    const dexLogoMap: Record<string, string> = {
        // Uniswap variants
        "uniswap": "/assets/exchanges/uniswap.svg",
        "uniswap v2": "/assets/exchanges/uniswap.svg",
        "uniswap v3": "/assets/exchanges/uniswap.svg",
        "uniswap_v2": "/assets/exchanges/uniswap.svg",
        "uniswap_v3": "/assets/exchanges/uniswap.svg",
        // Raydium
        "raydium": "/assets/exchanges/raydium.svg",
        "raydium-amm": "/assets/exchanges/raydium-amm.webp",
        "raydium amm": "/assets/exchanges/raydium-amm.webp",
        // Pancakeswap
        "pancakeswap": "/assets/exchanges/pancakeswap.svg",
        "pancake": "/assets/exchanges/pancakeswap.svg",
        // Sushiswap
        "sushiswap": "/assets/exchanges/sushiswap.svg",
        "sushi": "/assets/exchanges/sushiswap.svg",
        // Curve
        "curve": "/assets/exchanges/curve-dex.webp",
        "curve-dex": "/assets/exchanges/curve-dex.webp",
        // Aerodrome
        "aerodrome": "/assets/exchanges/aerodrome.webp",
        // Balancer
        "balancer": "/assets/exchanges/balancer.webp",
        // Camelot
        "camelot": "/assets/exchanges/camelot.webp",
        // Meteora
        "meteora": "/assets/exchanges/meteora.webp",
        // Pumpswap
        "pumpswap": "/assets/exchanges/pumpswap.webp",
        "pump.fun": "/assets/exchanges/pumpswap.webp",
        // QuickSwap
        "quickswap": "/assets/exchanges/quickswap.webp",
        // DODO
        "dodo": "/assets/exchanges/dodo-amm.webp",
        "dodo-amm": "/assets/exchanges/dodo-amm.webp",
        // Fluid
        "fluid": "/assets/exchanges/fluid.webp",
        // Jupiter
        "jupiter": "/assets/exchanges/jupyter.svg",
        // Hyperliquid
        "hyperliquid": "/assets/exchanges/hyperliquid-spot-orderbook.webp",
        // Orca
        "orca": "/assets/exchanges/orca.webp",
    };
    
    return dexLogoMap[dexLower] || null;
}

/**
 * Maps token symbols to their logo file paths in public/icons/chain-icons
 */
function getTokenLogoPath(symbol: string | undefined): string | null {
    if (!symbol) return null;
    
    const symbolLower = symbol.toLowerCase().trim();
    
    const tokenLogoMap: Record<string, string> = {
        "usdc": LIQUID_GLASS_LOGOS.usdc,
        "usdt": LIQUID_GLASS_LOGOS.tether,
        "sol": "/icons/chain-icons/sol.svg",
        "eth": LIQUID_GLASS_LOGOS.ethereum,
        "weth": LIQUID_GLASS_LOGOS.ethereum,
        "bnb": LIQUID_GLASS_LOGOS.bnb,
        "sui": "/icons/chain-icons/sui.svg",
        "pol": "/icons/chain-icons/polygon.svg",
        "matic": "/icons/chain-icons/polygon.svg",
        "avax": "/icons/chain-icons/avax.svg",
        "btc": LIQUID_GLASS_LOGOS.bitcoin,
        "wbtc": "/icons/chain-icons/wbtc.svg",
        "dai": "/icons/chain-icons/dai.svg",
        "arb": "/icons/chain-icons/arbitrum.svg",
        "op": "/icons/chain-icons/optimism.svg",
        "base": "/icons/chain-icons/base.svg",
    };
    
    return tokenLogoMap[symbolLower] || null;
}

/**
 * Parse pair name to extract base and quote tokens
 * e.g., "SOL/USDC" -> { base: "SOL", quote: "USDC" }
 */
function parsePairName(pairName: string): { base: string; quote: string } {
    const parts = pairName.split(/[\/\-]/);
    return {
        base: parts[0]?.trim() || "",
        quote: parts[1]?.trim() || "",
    };
}

export function PoolsTable({ pools, symbol, tokenLogoUrl }: PoolsTableProps) {
    if (!pools || pools.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Droplets className="w-12 h-12 mb-3 opacity-20" />
                <p>No liquidity pools found</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60">
                        <TableHead className="text-muted-foreground">Pair</TableHead>
                        <TableHead className="text-right text-muted-foreground">Price</TableHead>
                        <TableHead className="text-right text-muted-foreground">24h Change</TableHead>
                        <TableHead className="text-right text-muted-foreground">Liquidity</TableHead>
                        <TableHead className="text-right text-muted-foreground">Volume (24h)</TableHead>
                        <TableHead className="text-right text-muted-foreground">DEX</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pools.map((pool, index) => {
                        const dexLogoPath = getDexLogoPath(pool.dex);
                        const pairName = pool.name || `${symbol}/USDC`;
                        const { base, quote } = parsePairName(pairName);
                        
                        // Prefer API-provided logo URLs, fall back to local mappings
                        const baseLogoPath = pool.baseToken?.logoUrl || getTokenLogoPath(base) || tokenLogoUrl;
                        const quoteLogoPath = pool.quoteToken?.logoUrl || getTokenLogoPath(quote);
                        
                        const priceChangePercent = pool.priceChange24h;
                        const isPriceUp = priceChangePercent !== undefined && priceChangePercent >= 0;
                        
                        return (
                            <TableRow key={`${pool.address}-${index}`} className="hover:bg-accent/40 border-border/60 transition-colors">
                                <TableCell className="font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                        {/* Pair token logos (stacked) */}
                                        <div className="flex items-center -space-x-1.5">
                                            {baseLogoPath && (
                                                <Image
                                                    src={baseLogoPath}
                                                    alt={base}
                                                    width={20}
                                                    height={20}
                                                    className="rounded-full ring-2 ring-background z-10"
                                                />
                                            )}
                                            {quoteLogoPath && (
                                                <Image
                                                    src={quoteLogoPath}
                                                    alt={quote}
                                                    width={20}
                                                    height={20}
                                                    className="rounded-full ring-2 ring-background"
                                                />
                                            )}
                                        </div>
                                        <span>{pairName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-foreground/90">
                                    ${pool.price < 0.01 ? pool.price.toFixed(6) : pool.price.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {priceChangePercent !== undefined ? (
                                        <span className={isPriceUp ? "text-emerald-500" : "text-rose-500"}>
                                            {isPriceUp ? "+" : ""}{priceChangePercent.toFixed(2)}%
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    ${formatNumber(pool.liquidity)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    ${formatNumber(pool.volume24h)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted/40 text-foreground/80">
                                        {dexLogoPath && (
                                            <Image
                                                src={dexLogoPath}
                                                alt={pool.dex || "DEX"}
                                                width={14}
                                                height={14}
                                                className="rounded-full"
                                            />
                                        )}
                                        {pool.dex}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {pool.url && (
                                        <a 
                                            href={pool.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
