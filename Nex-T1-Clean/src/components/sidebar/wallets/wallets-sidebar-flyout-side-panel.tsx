"use client";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WalletRightPanel } from "./wallet-right-panel";
import type { WalletFlyoutSidePanelProps } from "./wallets-sidebar-flyout.types";

export function WalletFlyoutSidePanel({
  activeWallet,
  activeView,
  onViewChange,
  selectedAsset,
  isPortfolioView,
  walletScope,
}: WalletFlyoutSidePanelProps) {
  return (
    <div
      className={cn(
        "shrink-0 flex-col transition-all duration-300",
        "sm:flex sm:w-[380px]",
        isPortfolioView ? "hidden sm:flex" : "flex h-full w-full p-4 sm:p-0",
        walletScope === "agent" && "hidden sm:hidden",
      )}
    >
      <div className="relative flex h-full flex-col sm:rounded-[24px] sm:border sm:border-[#EBEBEB] sm:bg-white/60 sm:p-6 sm:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_24px_48px_rgba(15,23,42,0.08)] sm:backdrop-blur-xs dark:sm:border-white/10 dark:sm:bg-[#C4C4C4]/5 dark:sm:shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            {!isPortfolioView ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange("portfolio")}
                className="h-8 w-8 text-[#666666] hover:bg-black/5 hover:text-[#171717] dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
          <div className="-mr-2 -mt-2" />
        </div>

        {activeWallet ? (
          <WalletRightPanel
            wallet={activeWallet}
            activeView={activeView}
            onViewChange={onViewChange}
            selectedAsset={selectedAsset}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#666666] dark:text-zinc-500">
            Select a wallet
          </div>
        )}
      </div>
    </div>
  );
}
