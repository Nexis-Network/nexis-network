"use client";

import { cn } from "@/lib/utils";
import { EthBalanceDisplay } from "./eth-balance-display";
import { SolBalanceDisplay } from "./sol-balance-display";
import { BaseBalanceDisplay } from "./base-balance-display";
import { ArbitrumBalanceDisplay } from "./arbitrum-balance-display";
import { OptimismBalanceDisplay } from "./optimism-balance-display";
import { BnbBalanceDisplay } from "./bnb-balance-display";
import { HyperliquidBalanceDisplay } from "./hyperliquid-balance-display";
import { SuiBalanceDisplay } from "./sui-balance-display";

interface NativeBalanceContainerProps {
  className?: string;
  showEth?: boolean;
  showSol?: boolean;
  ethMaxDecimals?: number;
  solMaxDecimals?: number;
  chains?: Array<
    "eth" | "sol" | "base" | "arbitrum" | "optimism" | "bnb" | "hyperliquid" | "sui"
  >;
}

export function NativeBalanceContainer({
  className = "",
  showEth = true,
  showSol = true,
  ethMaxDecimals = 4,
  solMaxDecimals = 4,
  chains,
}: NativeBalanceContainerProps) {
  const desiredChains =
    chains ??
    [
      ...(showEth ? (["eth"] as const) : []),
      ...(showSol ? (["sol"] as const) : []),
    ];

  const items = desiredChains.map((chain) => {
    switch (chain) {
      case "eth":
        return (
          <EthBalanceDisplay
            key="eth"
            showLogo
            maxDecimals={ethMaxDecimals}
          />
        );
      case "sol":
        return (
          <SolBalanceDisplay
            key="sol"
            showLogo
            maxDecimals={solMaxDecimals}
          />
        );
      case "base":
        return <BaseBalanceDisplay key="base" showLogo />;
      case "arbitrum":
        return <ArbitrumBalanceDisplay key="arbitrum" showLogo />;
      case "optimism":
        return <OptimismBalanceDisplay key="optimism" showLogo />;
      case "bnb":
        return <BnbBalanceDisplay key="bnb" showLogo />;
      case "hyperliquid":
        return <HyperliquidBalanceDisplay key="hyperliquid" showLogo />;
      case "sui":
        return <SuiBalanceDisplay key="sui" showLogo />;
      default:
        return null;
    }
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map((item, index) => {
        if (!item) return null;
        const chainKey = desiredChains[index] ?? `chain-${index}`;
        return (
          <div
            key={`${chainKey}-${index}`}
            className="flex h-10 min-w-[142px] items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-foreground shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
