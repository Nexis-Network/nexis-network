"use client";

import { DollarIcon } from "@/components/sidebar-03/animated-icons";

import { Skeleton } from "@/components/ui/skeleton";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";
import { HoldingRow } from "./holding-row";

export function TopHoldingsCard() {
  const { data: profileData, isLoading } = useProfileAggregate();

  // Aggregate top holdings across all wallets
  const holdings = (profileData as Record<string, unknown>)?.topHoldings;
  const holdingsList = Array.isArray(holdings) ? holdings.slice(0, 5) : [];

  if (isLoading) {
    return (
      <BentoCard>
        <BentoCardHeader title="Top Holdings" status="online" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-16 bg-white/5" />
                <Skeleton className="h-2.5 w-10 bg-white/5" />
              </div>
              <Skeleton className="h-3 w-14 bg-white/5" />
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  if (holdingsList.length === 0) {
    return (
      <BentoCard>
        <BentoCardHeader title="Top Holdings" status="online" />
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <DollarIcon className="size-6 text-[var(--bento-text-muted)]/40" />
          <p className="text-xs text-[var(--bento-text-muted)]">No holdings yet</p>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard noPadding>
      <div className="px-[14.4px] pt-[14.4px]">
        <BentoCardHeader title="Top Holdings" status="online" />
      </div>
      <div className="max-h-[350px] overflow-y-auto px-1 pb-2">
        {holdingsList.map((h: Record<string, unknown>, i: number) => (
          <HoldingRow
            key={String(h.symbol ?? i)}
            symbol={String(h.symbol ?? "")}
            name={String(h.name ?? "")}
            logoUrl={typeof h.logo === "string" ? h.logo : undefined}
            balanceUsd={typeof h.balanceUsd === "number" ? h.balanceUsd : 0}
            changePercent={typeof h.change24h === "number" ? h.change24h : null}
          />
        ))}
      </div>
    </BentoCard>
  );
}
