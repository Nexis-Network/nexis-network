"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WalletTokenPosition } from "@/modules/wallets/profile";
import { WalletViewType } from "./wallet-right-panel";
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, ArrowLeftRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetRow } from "@/components/common/asset-row";
import { featureFlags } from "@/lib/feature-flags";

import { getChainIconById } from "@/lib/chain-icons";

interface WalletAssetItemProps {
  token: WalletTokenPosition;
  isVerified: boolean;
  onViewChange?: (view: WalletViewType, token?: WalletTokenPosition) => void;
}

export function WalletAssetItem({ token, isVerified, onViewChange }: WalletAssetItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (e: React.MouseEvent, view: WalletViewType) => {
    e.stopPropagation();
    if (view === "assetDetail") {
      onViewChange?.(view, token);
      return;
    }
    onViewChange?.(view);
  };

  // Adapter: WalletTokenPosition -> AssetRowToken
  const assetRowToken = {
    id: token.contract || token.id,
    chain: token.chainId?.toString(),
    decimals: token.decimals ?? 0,
    balance: token.balance.toString(),
    uiAmount: token.uiAmountString ?? token.uiAmount ?? token.balance,
    name: token.name || "Unknown",
    symbol: token.symbol || "UNK",
    logoURI: token.logoURI || null,
    priceUsd: token.priceUsd || null,
    valueUsd: token.valueUsd || null,
    isNative: token.isNative,
  };

  const chainLogoUrl = getChainIconById(token.chainId ? Number(token.chainId) : null);

  return (
    <div
      className="relative h-[68px] w-full overflow-hidden rounded-lg bg-transparent transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5"
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(true)}
    >
      {/* Content Layer - Slides Left */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex cursor-pointer items-center justify-between px-0 transition-transform duration-300 ease-out",
          isOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <AssetRow 
            token={assetRowToken} 
            isVerified={isVerified}
            chainLogoUrl={chainLogoUrl}
            className="w-full h-full hover:bg-transparent px-3" 
        />
      </div>

      {/* Actions Layer - Revealed on Slide */}
      <div
        className={cn(
          "absolute inset-0 z-0 flex items-center justify-end bg-transparent transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex h-full w-full">
          <ActionButton
            label="Send"
            icon={ArrowUpRight}
            onClick={(e) => handleAction(e, "send")}
            className="bg-black/[0.05] hover:bg-black/[0.09] dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]"
          />
          <ActionButton
            label="Receive"
            icon={ArrowDownLeft}
            onClick={(e) => handleAction(e, "receive")}
            className="bg-black/[0.05] hover:bg-black/[0.09] dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]"
          />
          <ActionButton
            label="Swap"
            icon={RefreshCcw}
            onClick={(e) => handleAction(e, "swap")}
            className="bg-black/[0.05] hover:bg-black/[0.09] dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]"
          />
          {featureFlags.walletAssetDetailV1 ? (
            <ActionButton
              label="View"
              icon={Eye}
              onClick={(e) => handleAction(e, "assetDetail")}
              className="bg-black/[0.05] hover:bg-black/[0.09] dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]"
            />
          ) : (
            <ActionButton
              label="Bridge"
              icon={ArrowLeftRight}
              onClick={(e) => handleAction(e, "bridge")}
              className="bg-black/[0.05] hover:bg-black/[0.09] dark:bg-[#2a2a2a] dark:hover:bg-[#3a3a3a]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string;
  icon: UntypedJson;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "group flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none border-l border-black/10 transition-colors dark:border-white/5",
        className,
      )}
    >
      <Icon className="h-4 w-4 text-[#666666] transition-colors group-hover:text-[#171717] dark:text-zinc-400 dark:group-hover:text-white" />
      <span className="text-[10px] font-medium text-[#666666] transition-colors group-hover:text-[#171717] dark:text-zinc-500 dark:group-hover:text-white">
        {label}
      </span>
    </Button>
  );
}
