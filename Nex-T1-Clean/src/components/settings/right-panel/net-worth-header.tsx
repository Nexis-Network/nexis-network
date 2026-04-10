"use client";

import { useMemo } from "react";

import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";

import { BentoCard } from "../shared/bento-card";
import { CurrencyDisplay } from "../shared/currency-display";
import { MonoValue } from "../shared/mono-value";

export function NetWorthHeader() {
  const { data: profileData, isLoading } = useProfileAggregate();
  const wallets = useMemo(() => {
    return Array.isArray(profileData?.wallets) ? profileData.wallets : [];
  }, [profileData?.wallets]);

  const totalNetWorth = useMemo(() => {
    return wallets.reduce((sum, wallet) => {
      const value = typeof wallet.netWorthUsd === "number" && Number.isFinite(wallet.netWorthUsd) ? wallet.netWorthUsd : 0;
      return sum + value;
    }, 0);
  }, [wallets]);

  const walletCount = wallets.length;

  if (isLoading) {
    return (
      <BentoCard className="animate-pulse">
        <div className="h-4 w-20 rounded bg-white/5" />
        <div className="mt-2 h-8 w-40 rounded bg-white/5" />
      </BentoCard>
    );
  }

  return (
    <BentoCard>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--bento-text-muted)]">
          Net Worth
        </span>
        <span className="text-[11px] text-[var(--bento-text-muted)]">
          <MonoValue>{walletCount}</MonoValue> wallet{walletCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-1">
        <CurrencyDisplay value={totalNetWorth} className="text-2xl font-bold text-[var(--bento-text-primary)]" />
      </div>
    </BentoCard>
  );
}
