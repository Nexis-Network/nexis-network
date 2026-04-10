"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { formatDisplayBalance } from "@/lib/cdp/cdp-balance-format";
import { resolveCdpEmbeddedEvmSelectionChainId } from "@/lib/cdp/cdp-wallet-selection";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import type { WalletPortfolio } from "@/lib/user/profile";
import { WalletBlockie } from "@/components/ui/wallet-blockie";
import { resolveWalletLabel } from "@/components/settings/wallets/lib/wallet-normalizers";
import { BentoCard } from "../shared/bento-card";
import { WalletSelectorHeaderDropdown } from "./wallet-selector-header-dropdown";

export function WalletSelectorHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: userWallets, isLoading: walletsLoading } = useUserWallets();
  const wallets = React.useMemo(() => {
    const candidates = Array.isArray(userWallets?.wallets) ? userWallets.wallets : [];
    return candidates.filter(
      (w) => w.walletType === "embedded" || w.walletType === "agent_generated" || w.providerName?.toLowerCase().includes("coinbase")
    );
  }, [userWallets?.wallets]);

  useEffect(() => {
    if (!selectedAddress && wallets.length > 0 && wallets[0].address) {
      setSelectedAddress(wallets[0].address);
    }
  }, [wallets, selectedAddress]);

  const selectedWallet = wallets.find((w) => w.address?.toLowerCase() === selectedAddress?.toLowerCase());
  const platform = selectedAddress?.startsWith("0x") ? "evm" : "solana";
  const selectedChainId =
    platform === "evm"
      ? resolveCdpEmbeddedEvmSelectionChainId({
          address: selectedAddress,
          wallets: userWallets?.wallets,
        })
      : undefined;
  
  const { data: cdpBalance, isLoading: balanceLoading } = useCdpBalance(
    selectedAddress,
    platform,
    selectedChainId,
  );

  const getWalletLabel = (wallet?: WalletPortfolio) => (!wallet ? "Select wallet" : resolveWalletLabel(wallet));
  const formatAddress = (address?: string | null) => (!address ? "" : `${address.slice(0, 6)}...${address.slice(-4)}`);

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  if (walletsLoading) {
    return (
      <BentoCard className="animate-pulse">
        <div className="h-4 w-20 rounded bg-white/5" />
        <div className="mt-2 h-8 w-40 rounded bg-white/5" />
      </BentoCard>
    );
  }

  if (wallets.length === 0) {
    return (
      <BentoCard>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--bento-text-muted)]">
            Nex Wallet
          </span>
        </div>
        <div className="mt-2 text-sm text-[var(--bento-text-muted)]">
          No Nex Wallets found
        </div>
      </BentoCard>
    );
  }

  const nativeBalance = formatDisplayBalance(
    cdpBalance?.native?.balance,
    cdpBalance?.native?.decimals ?? (platform === "solana" ? 9 : 18),
  );
  const nativeSymbol = cdpBalance?.native?.symbol || (platform === "evm" ? "ETH" : "SOL");
  const usdValue = cdpBalance?.native?.usdValue ? cdpBalance.native.usdValue.toFixed(2) : "0.00";

  return (
    <BentoCard className="relative overflow-visible" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left focus:outline-none group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--bento-text-muted)]">
            Wallet Selector
          </span>
          <ChevronDown className={`size-4 text-[var(--bento-text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`} />
        </div>
        <div className="flex items-center gap-3">
          {selectedAddress && (
            <div className="shrink-0">
              <WalletBlockie address={selectedAddress} size={8} scale={4} className="rounded-full border border-white/10" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[var(--bento-text-primary)] text-sm font-medium truncate">
                {getWalletLabel(selectedWallet)}
              </span>
              {selectedAddress && (
                <button
                  onClick={(e) => copyToClipboard(e, selectedAddress)}
                  className="p-1 hover:bg-white/10 rounded text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)] transition-colors"
                  title="Copy address"
                >
                  <Copy className="size-3" />
                </button>
              )}
            </div>
            {selectedAddress && (
              <div className="text-xs text-[var(--bento-text-muted)] mt-0.5 font-mono font-normal">
                {formatAddress(selectedAddress)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--bento-border)]">
          {balanceLoading ? (
            <div className="space-y-1">
              <div className="h-5 w-24 rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="text-lg text-[var(--bento-text-primary)] font-mono font-normal">
                {nativeBalance} {nativeSymbol}
              </div>
              <div className="text-xs text-[var(--bento-text-muted)] font-mono font-normal">
                ${usdValue}
              </div>
            </div>
          )}
        </div>
      </button>

      {isOpen ? (
        <WalletSelectorHeaderDropdown
          wallets={wallets}
          selectedAddress={selectedAddress}
          onSelectWallet={(address) => {
            setSelectedAddress(address);
            setIsOpen(false);
          }}
          getWalletLabel={getWalletLabel}
          formatAddress={formatAddress}
        />
      ) : null}
    </BentoCard>
  );
}
