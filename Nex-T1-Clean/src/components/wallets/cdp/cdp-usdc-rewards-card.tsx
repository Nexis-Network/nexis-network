"use client";

import { Coins, TrendingUp, DollarSign } from "lucide-react";
import { useCdpUsdcRewards } from "@/lib/hooks/cdp/use-cdp-usdc-rewards";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CdpUsdcRewardsCardProps = {
  /** The EVM wallet address to show rewards for. Pass `null` to show empty state. */
  address: string | null;
  /** Additional CSS classes for the root container. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ShimmerLine({ width }: { width: string }) {
  return (
    <div
      className={cn("h-4 animate-pulse rounded bg-white/10", width)}
    />
  );
}

function ApyBadge({ apy }: { apy: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
      <TrendingUp className="h-3 w-3" />
      {apy}% APY
    </span>
  );
}

function NetworkRow({
  network,
  balance,
  earned,
}: {
  network: string;
  balance: string;
  earned: string;
}) {
  const displayName = network.charAt(0).toUpperCase() + network.slice(1);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground capitalize">{displayName}</span>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-muted-foreground">
          ${balance}
        </span>
        <span className="tabular-nums text-green-400/80">
          +${earned}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * USDC Rewards card for Nex Wallets.
 *
 * Shows:
 * - "USDC Rewards" header with Coins icon
 * - Current APY badge (e.g., "4.1% APY" in green)
 * - Total earned amount
 * - Balance eligible for rewards
 * - Per-network breakdown (if multiple)
 * - Empty state if no USDC balance
 */
export function CdpUsdcRewardsCard({
  address,
  className,
}: CdpUsdcRewardsCardProps) {
  const { data, isLoading, error } = useCdpUsdcRewards(address ?? undefined);

  // No address provided
  if (!address) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-white">USDC Rewards</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect a wallet to view USDC rewards.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-white">USDC Rewards</span>
          </div>
          <ShimmerLine width="w-16" />
        </div>
        <ShimmerLine width="w-24" />
        <ShimmerLine width="w-32" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-white">USDC Rewards</span>
        </div>
        <p className="text-xs text-red-400/80">
          Unable to load rewards data.
        </p>
      </div>
    );
  }

  // Empty state: no USDC balance
  if (!data || parseFloat(data.balance) === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-white">USDC Rewards</span>
          </div>
          <ApyBadge apy={data?.currentApy ?? 4.1} />
        </div>
        <p className="text-xs text-muted-foreground">
          Hold USDC in your wallet to start earning rewards automatically.
        </p>
      </div>
    );
  }

  // Active rewards state
  const activeNetworks = data.networks.filter(
    (n) => parseFloat(n.balance) > 0,
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-3",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-white">USDC Rewards</span>
        </div>
        <ApyBadge apy={data.currentApy} />
      </div>

      {/* Earned amount */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Est. Annual Earnings
        </p>
        <p className="text-lg font-semibold tabular-nums text-green-400">
          +${data.totalEarned}
        </p>
      </div>

      {/* Eligible balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Eligible Balance</span>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          ${data.balance} USDC
        </span>
      </div>

      {/* Per-network breakdown */}
      {activeNetworks.length > 1 && (
        <div className="space-y-1.5 border-t border-white/5 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Network Breakdown
          </p>
          {activeNetworks.map((n) => (
            <NetworkRow
              key={n.network}
              network={n.network}
              balance={n.balance}
              earned={n.earned}
            />
          ))}
        </div>
      )}

      {/* Last accrual */}
      {data.lastAccrual && (
        <p className="text-[10px] text-muted-foreground/60">
          Estimated as of {new Date(data.lastAccrual).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
