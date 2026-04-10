"use client";

import { Wallet } from "lucide-react";
import { useMemo } from "react";

import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { Skeleton } from "@/components/ui/skeleton";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";
import { WalletOverviewRow } from "./wallet-overview-row";

interface WalletEntry {
  address: string;
  label: string;
  netWorthUsd: number;
  change24hPercent?: number | null;
}

export function WalletOverviewCard() {
  const { data: profileData, isLoading } = useProfileAggregate();
  const walletsInput = useMemo(() => {
    return Array.isArray(profileData?.wallets) ? profileData.wallets : [];
  }, [profileData?.wallets]);

  const wallets: WalletEntry[] = useMemo(() => {
    return walletsInput
      .map((w) => ({
        address: typeof w.address === "string" ? w.address : "",
        label: typeof w.label === "string" ? w.label : typeof w.walletType === "string" ? w.walletType : "Wallet",
        netWorthUsd: typeof w.netWorthUsd === "number" ? w.netWorthUsd : 0,
        change24hPercent: typeof w.change24hPercent === "number" ? w.change24hPercent : null,
      }))
      .filter((w) => w.address)
      .sort((a, b) => b.netWorthUsd - a.netWorthUsd);
  }, [walletsInput]);

  if (isLoading) {
    return (
      <BentoCard>
        <BentoCardHeader title="Wallets" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24 bg-white/5" />
                <Skeleton className="h-2.5 w-16 bg-white/5" />
              </div>
              <Skeleton className="h-3 w-16 bg-white/5" />
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  if (wallets.length === 0) {
    return (
      <BentoCard>
        <BentoCardHeader title="Wallets" />
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Wallet className="size-6 text-[var(--bento-text-muted)]/40" />
          <p className="text-xs text-[var(--bento-text-muted)]">No wallets connected</p>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard noPadding>
      <div className="px-[14.4px] pt-[14.4px]">
        <BentoCardHeader title="Wallets" />
      </div>
      <div className="max-h-[280px] overflow-y-auto px-1 pb-2">
        {wallets.map((w) => (
          <WalletOverviewRow
            key={w.address}
            address={w.address}
            label={w.label}
            netWorthUsd={w.netWorthUsd}
            change24hPercent={w.change24hPercent}
          />
        ))}
      </div>
    </BentoCard>
  );
}
