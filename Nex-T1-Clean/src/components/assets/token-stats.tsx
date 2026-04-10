"use client";

import { TokenSecurity, TokenTradeData } from "@/types/market";
import { formatCurrency } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export function TokenSecurityCard({ security }: { security: TokenSecurity | null }) {
    if (!security) return null;

    return (
        <div className="space-y-4 pt-4 border-t border-border/60">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Token Security
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Created</span>
                    <div className="text-sm font-mono text-foreground/90">
                        {security.creationTime > 0 
                             ? new Date(security.creationTime * 1000).toLocaleDateString() 
                             : "Unknown"}
                    </div>
                </div>
                
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Creator</span>
                    <div className="text-sm font-mono text-foreground/90 truncate" title={security.creatorAddress}>
                        {security.creatorAddress ? `${security.creatorAddress.slice(0, 6)}...` : "Unknown"}
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Mint Info</span>
                    <div className="flex items-center gap-2">
                        {/* Example checks using isTrueToken/isHoneypot if available */}
                        {security.isHoneypot !== undefined && (
                             security.isHoneypot 
                             ? <span className="text-xs text-rose-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Risks Found</span>
                             : <span className="text-xs text-emerald-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Standard</span>
                        )}
                        {!security.isHoneypot && <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TokenTradeVolume({ data }: { data: TokenTradeData | null }) {
    if (!data) return null;
    
    // Calculate percentages for progress bar
    const totalVol = data.buy24hUSD + data.sell24hUSD;
    // Avoid division by zero
    const buyPercent = totalVol > 0 ? (data.buy24hUSD / totalVol) * 100 : 50;
    const sellPercent = 100 - buyPercent;

    return (
        <div className="space-y-4 pt-6 border-t border-border/60">
            <h3 className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>24h Volume Split</span>
                <span className="text-xs font-mono text-muted-foreground">{formatCurrency(data.volume24hUSD)}</span>
            </h3>

            {/* Top Stats Row (Trades, Volume, Makers etc if we had them) */}
            <div className="grid grid-cols-2 gap-4 text-center pb-2">
                <div>
                     <div className="text-[10px] text-muted-foreground uppercase">Buys ({(data.tradeCount24h / 2).toFixed(0)}~)</div>
                     <div className="text-sm font-medium text-emerald-500">{formatCurrency(data.buy24hUSD)}</div>
                </div>
                <div>
                     <div className="text-[10px] text-muted-foreground uppercase">Sells ({(data.tradeCount24h / 2).toFixed(0)}~)</div>
                     <div className="text-sm font-medium text-rose-500">{formatCurrency(data.sell24hUSD)}</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-2 bg-muted/40 rounded-full overflow-hidden flex">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${buyPercent}%` }} 
                />
                <div 
                    className="h-full bg-rose-500 transition-all duration-500" 
                    style={{ width: `${sellPercent}%` }} 
                />
            </div>
            
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                 <span>{buyPercent.toFixed(1)}% Buy</span>
                 <span>{sellPercent.toFixed(1)}% Sell</span>
            </div>
        </div>
    );
}
