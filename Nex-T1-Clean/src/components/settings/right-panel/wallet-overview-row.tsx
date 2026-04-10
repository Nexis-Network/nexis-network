"use client";

import { cn } from "@/lib/utils";
import { WalletBlockie } from "@/components/ui/wallet-blockie";

import { AddressDisplay } from "../shared/address-display";
import { CurrencyDisplay } from "../shared/currency-display";
import { MonoValue } from "../shared/mono-value";

interface WalletOverviewRowProps {
  address: string;
  label: string;
  netWorthUsd: number;
  change24hPercent?: number | null;
  onClick?: () => void;
}

export function WalletOverviewRow({ address, label, netWorthUsd, change24hPercent, onClick }: WalletOverviewRowProps) {
  const hasPnl = typeof change24hPercent === "number" && Number.isFinite(change24hPercent);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
    >
      <WalletBlockie address={address} size={8} scale={3} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-[var(--bento-text-primary)]">{label}</div>
        <AddressDisplay address={address} truncateLength={3} className="text-[10px]" />
      </div>
      <div className="text-right">
        <CurrencyDisplay value={netWorthUsd} className="text-[12px] text-[var(--bento-text-primary)]" />
        {hasPnl && (
          <div className={cn("text-[10px]", change24hPercent! > 0 ? "text-[#c7c7cc]" : change24hPercent! < 0 ? "text-[#c7c7cc]" : "text-[var(--bento-text-muted)]")}>
            <MonoValue>{change24hPercent! > 0 ? "+" : ""}{change24hPercent!.toFixed(2)}%</MonoValue>
          </div>
        )}
      </div>
    </button>
  );
}
