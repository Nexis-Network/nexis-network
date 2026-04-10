"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import Image from "next/image";
import { Sparkline } from "@/components/ui/sparkline";
import type { WalletPortfolio } from "@/lib/user/profile";
import { usePortfolioTokenItems } from "@/modules/tokens/hooks/use-portfolio-token-items";
import { AddCustomTokenDialog } from "./add-custom-token-dialog";
import { cn } from "@/lib/utils";

export interface TokensTableProps {
  chainId?: string;
  wallets?: WalletPortfolio[];
}

// Chain ID to name mapping
const CHAIN_NAMES: Record<string, string> = {
  all: "All Networks",
  ethereum: "Ethereum",
  base: "Base",
  optimism: "Optimism",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
  solana: "Solana",
  avalanche: "Avalanche",
  linea: "Linea",
};

export function TokensTable({ chainId, wallets = [] }: TokensTableProps) {
  const router = useRouter();
  const { tokens, isLoading } = usePortfolioTokenItems(wallets, chainId);
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);

  const effectiveChainId = chainId || "all";
  const chainName = CHAIN_NAMES[effectiveChainId] || effectiveChainId;

  if (isLoading) {
      return (
        <div className="flex w-full items-center justify-center rounded-xl border border-border/60 bg-card/50 p-8">
             <span className="animate-pulse text-sm text-muted-foreground">Loading tokens...</span>
        </div>
      );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col mb-4">
        <h3 className="text-base font-medium text-foreground">Tokens</h3>
        <span className="text-xs text-muted-foreground">{tokens.length} token{tokens.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-border/60 px-4 py-3 text-xs font-normal uppercase tracking-wide text-muted-foreground">
          <div className="col-span-3">Token</div>
          <div className="col-span-1 text-right">Price</div>
          <div className="col-span-1 text-right">24h %</div>
          <div className="col-span-1 text-right">7d %</div>
          <div className="col-span-2 text-center">Last 7D</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-2 text-right">Value</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {tokens.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              No tokens found. Add a custom token to get started.
            </div>
          ) : (
            tokens.map((token, idx) => {
              const asset = token.asset;
              const history = token.priceHistory || [];
              const priceChange24h = token.usd_price_24hr_percent_change || 0;
              const isPositive = priceChange24h >= 0;
              const sparkColor = isPositive ? "#00D5FF" : "#FF4d4d"; // Blue or Red
              
              // Formatters
              const price = token.usd_price > 0 
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(token.usd_price)
                : "-";
              const priceChange7dRaw = token.usd_price_7d_percent_change;
              const has7dData = priceChange7dRaw != null && priceChange7dRaw !== 0;
              const priceChange7d = priceChange7dRaw ?? 0;
              const value = token.usd_value > 0
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(token.usd_value)
                : "$0.00";
              const balance = parseFloat(token.balance) || 0;
              const percentChange24h = priceChange24h !== 0 
                ? `${priceChange24h >= 0 ? "+" : ""}${priceChange24h.toFixed(2)}%`
                : "-";
              const percentChange7d = has7dData
                ? `${priceChange7d >= 0 ? "+" : ""}${priceChange7d.toFixed(2)}%`
                : "\u2014";

              return (
                <div 
                  key={`${token.token_address}-${idx}`} 
                  onClick={() => {
                      // Map numeric chainId to slug if possible
                      let chainSlug = String(asset.chainId);
                      if (asset.chainId === 1) chainSlug = "ethereum";
                      else if (asset.chainId === 137) chainSlug = "polygon";
                      else if (asset.chainId === 42161) chainSlug = "arbitrum";
                      else if (asset.chainId === 10) chainSlug = "optimism";
                      else if (asset.chainId === 8453) chainSlug = "base";
                      else if (asset.chainId === 999999) chainSlug = "solana";

                      router.push(`/assets/${chainSlug}/${asset.address}`);
                  }}
                  className="group grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-transparent transition-colors border-b border-transparent hover:border-border cursor-pointer rounded-lg relative"
                >
                  {/* Token */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center overflow-hidden flex-shrink-0">
                        {token.logo ? (
                            <Image 
                              src={token.logo} 
                              alt={asset.name} 
                              width={32} 
                              height={32} 
                              className="w-full h-full object-cover"
                              style={{ width: "auto", height: "auto" }}
                              unoptimized
                              onError={(e) => {
                                // Fallback to initials on image load error
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                        ) : null}
                        <div className={cn(
                          "w-full h-full bg-white/10 flex items-center justify-center text-[10px] rounded-full font-medium",
                          token.logo ? "hidden" : ""
                        )}>{asset.symbol.slice(0, 2).toUpperCase()}</div>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{asset.name}</span>
                          {token.isDefault && (
                            <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">DEFAULT</span>
                          )}
                          {token.isCustom && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">CUSTOM</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm text-foreground">{price}</span>
                  </div>

                  {/* 24h % Change */}
                  <div className="col-span-1 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium",
                      priceChange24h > 0 ? "text-emerald-400" : priceChange24h < 0 ? "text-red-400" : "text-muted-foreground"
                    )}>
                      <span>{percentChange24h}</span>
                    </div>
                  </div>

                  {/* 7d % Change */}
                  <div className="col-span-1 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 text-sm font-medium",
                      has7dData && priceChange7d > 0 ? "text-emerald-400" : has7dData && priceChange7d < 0 ? "text-red-400" : "text-muted-foreground"
                    )}>
                      <span>{percentChange7d}</span>
                    </div>
                  </div>

                  {/* Sparkline (Last 7D) */}
                  <div className="col-span-2 flex items-center justify-center h-full">
                     {history.length > 1 && history.some(v => v > 0) ? (
                         <Sparkline 
                           data={history} 
                           width={60} 
                           height={24} 
                           color={sparkColor} 
                         />
                     ) : (
                         <span className="text-xs text-muted-foreground">-</span>
                     )}
                  </div>

                  {/* Balance */}
                  <div className="col-span-2 text-right flex flex-col items-end">
                    <span className="text-sm font-medium text-foreground">
                      {balance > 0 ? balance.toFixed(4) : "0"}
                    </span>
                    <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                  </div>

                  {/* Value */}
                  <div className="col-span-2 text-right flex items-center justify-end gap-2">
                    <span className="text-sm font-medium text-foreground">{value}</span>
                    
                    {/* Hover Action */}
                    <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/60 text-foreground">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

         {/* Action Buttons */}
         <div className="mt-4 flex items-center gap-3">
             <button className="flex items-center gap-2 rounded-full border border-border/60 bg-transparent px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-accent/40">
                View all tokens
                <ArrowRight className="w-3 h-3" />
             </button>
             
             {/* Add Custom Token Button */}
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setIsAddTokenOpen(true);
               }}
               className="flex items-center gap-2 rounded-full border border-transparent bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/40 hover:text-foreground"
             >
                <Plus className="w-3 h-3" />
                Add custom
             </button>
         </div>
      </div>

      {/* Add Custom Token Dialog */}
      <AddCustomTokenDialog
        open={isAddTokenOpen}
        onOpenChange={setIsAddTokenOpen}
        chainId={effectiveChainId}
        chainName={chainName}
      />
    </div>
  );
}
