"use client";

import { useMemo, useState } from "react";
import { Plus, Wallet, Sparkles, ChevronRight, Settings2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWalletSummaries } from "@/lib/hooks/wallets/profile/use-wallet-summaries";
import { useChainStore } from "@/stores/chain-store";
import { getSupportedChains } from "@/lib/chains";
import { NetworkEthereum, NetworkBase, NetworkArbitrumOne, NetworkOptimism, NetworkPolygon, NetworkAvalanche, NetworkBinanceSmartChain } from "@web3icons/react";
import React from "react";
import Image from "next/image";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

// Placeholder for modals
import { McpCatalogModal } from "./mcp-catalog-modal";
import { ChainSelectionModal } from "./chain-selection-modal";

// Map for chain icons
const CHAIN_ICON_MAP: Record<number, React.ComponentType<UntypedJson>> = {
  1: NetworkEthereum,
  8453: NetworkBase,
  42161: NetworkArbitrumOne,
  10: NetworkOptimism,
  137: NetworkPolygon,
  43114: NetworkAvalanche,
  56: NetworkBinanceSmartChain,
  // Add others as needed, Solana needs special handling often as it's not EVM ID based usually but we map it visually
};

// Custom logos map
const CUSTOM_LOGOS: Record<string, string> = {
  ethereum: LIQUID_GLASS_LOGOS.ethereum,
  hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
  monad: "/icons/chain-icons/monad.svg",
  solana: LIQUID_GLASS_LOGOS.solana,
  bnb: LIQUID_GLASS_LOGOS.bnb,
  "bnb chain": LIQUID_GLASS_LOGOS.bnb,
};

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  
  // Wallet Data
  const { data: walletData, isLoading: isWalletLoading } = useWalletSummaries();
  const wallets = walletData?.wallets || [];
  const activeWallet = wallets[0]; // Assuming first is active for MVP

  // Chain Data
  const { activeChainIds } = useChainStore();
  const allChains = useMemo(() => getSupportedChains(), []);
  const activeChains = useMemo(() => allChains.filter(c => activeChainIds.includes(c.id)), [allChains, activeChainIds]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full border-dashed border-border/60 bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-300"
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-current opacity-20" />
              <Plus className="h-3.5 w-3.5" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="start" 
          sideOffset={8}
          className="w-80 p-0"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/20">
            <Settings2 className="h-4 w-4 text-sky-500" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Session Settings</span>
          </div>

          <div className="p-2 space-y-1">
            {/* Wallet Section */}
            <div className="rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:bg-muted/40 group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Wallet className="h-3.5 w-3.5 text-sky-500" />
                    <span>Active Wallet</span>
                 </div>
                 <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {isWalletLoading ? (
                  <div className="h-8 w-full animate-pulse rounded bg-muted/60" />
              ) : activeWallet ? (
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 p-[1px]">
                      <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                        <span className="text-[10px] font-bold">W1</span>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-medium truncate w-32">{activeWallet.address}</span>
                      <span className="text-[10px] text-muted-foreground">$ {activeWallet.totals.estimatedValueUsd?.toFixed(2) ?? "0.00"}</span>
                   </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic px-1">No active wallet</div>
              )}
            </div>

            {/* MCP Section */}
             <div className="rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:bg-muted/40 group">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>MCP Servers</span>
                   </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-8 text-xs justify-start gap-2 border-border/60 bg-background/50 hover:bg-background hover:text-sky-500"
                  onClick={() => {
                    setOpen(false);
                    setMcpModalOpen(true);
                  }}
                >
                   <Plus className="h-3 w-3" />
                   Add MCP Server
                </Button>
             </div>

             {/* Chains Section */}
             <div className="rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:bg-muted/40 group">
                <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => { setOpen(false); setChainModalOpen(true); }}>
                   <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <Globe className="h-3.5 w-3.5 text-[#8eb94f]" />
                      <span>Active Chains</span>
                   </div>
                   <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                   {activeChains.length > 0 ? activeChains.slice(0, 7).map(chain => {
                      // Check for custom icon first
                      const customIcon = Object.entries(CUSTOM_LOGOS).find(([k]) => chain.name.toLowerCase().includes(k))?.[1];
                      const IconComponent = CHAIN_ICON_MAP[chain.id];

                      return (
                        <div key={chain.id} className="h-6 w-6 rounded-md bg-background border border-border/60 flex items-center justify-center p-0.5" title={chain.name}>
                           {customIcon ? (
                             <Image src={customIcon} alt={chain.name} width={16} height={16} className="rounded-sm" />
                           ) : IconComponent ? (
                             <IconComponent variant="mono" className="h-4 w-4 text-foreground/80" />
                           ) : (
                             <span className="text-[8px] font-bold">{chain.name.slice(0, 2)}</span>
                           )}
                        </div>
                      );
                   }) : (
                     <span className="text-[10px] text-muted-foreground italic">No active chains</span>
                   )}
                   {activeChains.length > 7 && (
                      <div className="h-6 w-6 rounded-md bg-muted/50 border border-border/60 flex items-center justify-center text-[10px] text-muted-foreground">
                        +{activeChains.length - 7}
                      </div>
                   )}
                   
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md border border-dashed border-border/60 hover:border-primary/50 hover:text-primary"
                      onClick={() => {
                        setOpen(false);
                        setChainModalOpen(true);
                      }}
                   >
                      <Plus className="h-3 w-3" />
                   </Button>
                </div>
             </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Modals */}
      <McpCatalogModal open={mcpModalOpen} onOpenChange={setMcpModalOpen} />
      <ChainSelectionModal open={chainModalOpen} onOpenChange={setChainModalOpen} />
    </>
  );
}
