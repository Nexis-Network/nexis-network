"use client";

import { Check } from "lucide-react";

import { WalletBlockie } from "@/components/ui/wallet-blockie";
import type { WalletPortfolio } from "@/lib/user/profile";

type WalletSelectorHeaderDropdownProps = {
  wallets: WalletPortfolio[];
  selectedAddress: string | null;
  onSelectWallet: (address: string) => void;
  getWalletLabel: (wallet?: WalletPortfolio) => string;
  formatAddress: (address?: string | null) => string;
};

export function WalletSelectorHeaderDropdown({
  wallets,
  selectedAddress,
  onSelectWallet,
  getWalletLabel,
  formatAddress,
}: WalletSelectorHeaderDropdownProps) {
  return (
    <div className="absolute left-0 top-[calc(100%+8px)] z-[100] flex max-h-[280px] w-full flex-col items-stretch overflow-y-auto rounded-xl border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)] shadow-xl backdrop-blur-lg">
      {wallets.map((wallet) => {
        const isSelected = wallet.address?.toLowerCase() === selectedAddress?.toLowerCase();

        return (
          <button
            key={wallet.walletId}
            onClick={() => wallet.address && onSelectWallet(wallet.address)}
            className={`flex items-center justify-between border-b border-[var(--settings-border-soft)] p-3 text-left transition-colors last:border-0 hover:bg-[var(--settings-elevated)] ${isSelected ? "bg-[var(--settings-elevated)]" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              {wallet.address ? (
                <div className="flex shrink-0 items-center justify-center">
                  <WalletBlockie address={wallet.address} size={6} scale={4} className="rounded-full" />
                </div>
              ) : (
                <div className="size-6 shrink-0 rounded-full bg-[var(--settings-elevated)]" />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-[var(--bento-text-primary)]">
                  {getWalletLabel(wallet)}
                </span>
                <span className="truncate font-mono text-[11px] font-normal text-[var(--bento-text-muted)]">
                  {formatAddress(wallet.address)}
                </span>
              </div>
            </div>
            {isSelected ? (
              <Check className="size-4 shrink-0 text-[var(--bento-text-primary)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
