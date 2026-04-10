"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChainStore } from "@/stores/chain-store";
import { getSupportedChains } from "@/lib/chains";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  NetworkEthereum,
  NetworkBase,
  NetworkArbitrumOne,
  NetworkOptimism,
  NetworkPolygon,
  NetworkAvalanche,
  NetworkBinanceSmartChain,
} from "@web3icons/react";
import Image from "next/image";
import { useMemo, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

interface ChainSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map for chain icons (Duplicate for now, should extract to shared)
const CHAIN_ICON_MAP: Record<number, ComponentType<UntypedJson>> = {
  1: NetworkEthereum,
  8453: NetworkBase,
  42161: NetworkArbitrumOne,
  10: NetworkOptimism,
  137: NetworkPolygon,
  43114: NetworkAvalanche,
  56: NetworkBinanceSmartChain,
};

const CUSTOM_LOGOS: Record<string, string> = {
  ethereum: LIQUID_GLASS_LOGOS.ethereum,
  hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
  monad: "/icons/chain-icons/monad.svg",
  solana: LIQUID_GLASS_LOGOS.solana,
  bnb: LIQUID_GLASS_LOGOS.bnb,
  "bnb chain": LIQUID_GLASS_LOGOS.bnb,
};

export function ChainSelectionModal({
  open,
  onOpenChange,
}: ChainSelectionModalProps) {
  const { activeChainIds, toggleChain } = useChainStore();
  const allChains = useMemo(() => getSupportedChains(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Active Chains</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-2">
            {allChains.map((chain) => {
              const isActive = activeChainIds.includes(chain.id);
              const customIcon = Object.entries(CUSTOM_LOGOS).find(([k]) =>
                chain.name.toLowerCase().includes(k),
              )?.[1];
              const IconComponent = CHAIN_ICON_MAP[chain.id];

              return (
                <div
                  key={chain.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                    isActive
                      ? "bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
                      : "bg-card/50 border-border/40 hover:bg-muted/50",
                  )}
                  onClick={() => toggleChain(chain.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-md border",
                        isActive
                          ? "bg-background border-primary/20"
                          : "bg-background/50 border-border/20",
                      )}
                    >
                      {customIcon ? (
                        <Image
                          src={customIcon}
                          alt={chain.name}
                          width={24}
                          height={24}
                          className="rounded-sm"
                          style={{ width: "auto", height: "auto" }}
                        />
                      ) : IconComponent ? (
                        <IconComponent
                          variant="mono"
                          className="h-6 w-6 text-foreground"
                        />
                      ) : (
                        <span className="text-xs font-bold">
                          {chain.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{chain.name}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {chain.nativeCurrency.symbol}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleChain(chain.id)}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
