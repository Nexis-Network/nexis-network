"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedNumberInput } from "@/components/numbers/input-animation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCdpStakingPositions,
  useCdpStakingRewards,
  useCdpStake,
  useCdpUnstake,
  type CdpStakingPosition,
} from "@/lib/hooks/cdp/use-cdp-staking";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CdpStakingCardProps = {
  chain: "evm" | "solana";
  address: string | null;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAssetFromChain(chain: "evm" | "solana"): "eth" | "sol" {
  return chain === "evm" ? "eth" : "sol";
}

function getAssetSymbol(asset: "eth" | "sol"): string {
  return asset === "eth" ? "ETH" : "SOL";
}

function getDecimals(asset: "eth" | "sol"): number {
  return asset === "eth" ? 18 : 9;
}

function formatBaseUnits(amount: string, decimals: number): string {
  if (!amount || amount === "0") return "0";
  const raw = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;

  if (remainder === 0n) return whole.toString();

  const fractional = remainder.toString().padStart(decimals, "0");
  // Trim trailing zeros but keep at least 4 significant decimals
  const trimmed = fractional.replace(/0+$/, "");
  const display = trimmed.slice(0, Math.max(4, trimmed.length));
  return `${whole}.${display}`;
}

function parseToBaseUnits(amount: string, decimals: number): string {
  const parts = amount.split(".");
  const whole = parts[0] ?? "0";
  const frac = (parts[1] ?? "").padEnd(decimals, "0").slice(0, decimals);
  const combined = `${whole}${frac}`.replace(/^0+/, "") || "0";
  return combined;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-400 border-green-400/30";
    case "unbonding":
      return "text-yellow-400 border-yellow-400/30";
    case "completed":
      return "text-muted-foreground border-muted-foreground/30";
    case "pending":
      return "text-blue-400 border-blue-400/30";
    default:
      return "text-muted-foreground border-muted-foreground/30";
  }
}

/* ------------------------------------------------------------------ */
/*  Position Row                                                       */
/* ------------------------------------------------------------------ */

function PositionRow({
  position,
  asset,
  onUnstake,
  isUnstaking,
}: {
  position: CdpStakingPosition;
  asset: "eth" | "sol";
  onUnstake: (stakeId: string) => void;
  isUnstaking: boolean;
}) {
  const decimals = getDecimals(asset);
  const symbol = getAssetSymbol(asset);
  const formattedAmount = formatBaseUnits(position.amount, decimals);
  const formattedRewards = formatBaseUnits(position.rewards, decimals);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums text-white">
            {formattedAmount} {symbol}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px]", getStatusColor(position.status))}
          >
            {position.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span className="tabular-nums">{position.apy.toFixed(1)}% APY</span>
          </span>
          {position.rewards !== "0" && (
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-400" />
              <span className="tabular-nums text-green-400">
                +{formattedRewards} {symbol}
              </span>
            </span>
          )}
        </div>
      </div>

      {position.status === "active" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUnstake(position.stakeId)}
          disabled={isUnstaking}
          className="flex-shrink-0 text-xs text-muted-foreground hover:text-red-400"
        >
          {isUnstaking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowDownCircle className="h-3.5 w-3.5" />
          )}
          Unstake
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stake Form                                                         */
/* ------------------------------------------------------------------ */

function StakeForm({
  asset,
  onStake,
  onCancel,
  isStaking,
}: {
  asset: "eth" | "sol";
  onStake: (amount: string) => void;
  onCancel: () => void;
  isStaking: boolean;
}) {
  const [amount, setAmount] = useState("");
  const symbol = getAssetSymbol(asset);

  const handleSubmit = useCallback(() => {
    const trimmed = amount.trim();
    if (!trimmed || Number(trimmed) <= 0) return;

    const baseUnits = parseToBaseUnits(trimmed, getDecimals(asset));
    onStake(baseUnits);
  }, [amount, asset, onStake]);

  const isValid = amount.trim().length > 0 && Number(amount) > 0;

  return (
    <div className="space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="space-y-1.5">
        <label
          htmlFor="stake-amount"
          className="text-xs font-medium text-muted-foreground"
        >
          Amount to stake ({symbol})
        </label>
        <AnimatedNumberInput
          id="stake-amount"
          type="text"
          inputMode="decimal"
          placeholder={`0.0 ${symbol}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isStaking}
          className={cn(
            "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2",
            "text-sm tabular-nums text-white placeholder:text-muted-foreground/50",
            "focus:border-white/20 focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSubmit}
          disabled={!isValid || isStaking}
          className="flex-1"
        >
          {isStaking ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Staking...
            </>
          ) : (
            <>
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Confirm Stake
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isStaking}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * CDP Staking Card
 *
 * Displays current staking positions, rewards, and provides stake/unstake
 * controls for ETH or SOL on a Nex Wallet.
 *
 * Props:
 * - chain: "evm" | "solana" — Determines the staking asset (ETH/SOL)
 * - address: string | null — The Nex Wallet address
 * - className: optional additional styling
 */
export function CdpStakingCard({
  chain,
  address,
  className,
}: CdpStakingCardProps) {
  const [showStakeForm, setShowStakeForm] = useState(false);
  const [unstakingId, setUnstakingId] = useState<string | null>(null);

  const asset = getAssetFromChain(chain);
  const symbol = getAssetSymbol(asset);

  // Queries
  const {
    data: positions,
    isLoading: positionsLoading,
    error: positionsError,
  } = useCdpStakingPositions(address ?? undefined);

  const {
    data: rewards,
    isLoading: rewardsLoading,
  } = useCdpStakingRewards(address ?? undefined);

  // Mutations
  const {
    stake: stakeAsync,
    isPending: isStaking,
    error: stakeError,
    reset: resetStake,
  } = useCdpStake();

  const {
    unstake: unstakeAsync,
    isPending: isUnstaking,
    error: unstakeError,
    reset: resetUnstake,
  } = useCdpUnstake();

  // Filter positions by asset type
  const assetPositions = (positions ?? []).filter((p) => p.asset === asset);
  const activePositions = assetPositions.filter((p) => p.status === "active");
  const hasPositions = assetPositions.length > 0;

  // Aggregate reward data for this asset
  const assetRewards = rewards?.positions.filter((r) => r.asset === asset) ?? [];
  const totalRewardsForAsset = assetRewards.reduce(
    (sum, r) => sum + BigInt(r.rewards || "0"),
    0n,
  ).toString();
  const avgApy = assetRewards.length > 0
    ? assetRewards.reduce((sum, r) => sum + r.apy, 0) / assetRewards.length
    : 0;

  // Handlers
  const handleStake = useCallback(
    async (amountBaseUnits: string) => {
      if (!address) return;
      resetStake();

      try {
        await stakeAsync({
          walletAddress: address,
          amount: amountBaseUnits,
          asset,
        });
        setShowStakeForm(false);
      } catch {
        // Error is captured in stakeError
      }
    },
    [address, asset, stakeAsync, resetStake],
  );

  const handleUnstake = useCallback(
    async (stakeId: string) => {
      if (!address) return;
      resetUnstake();
      setUnstakingId(stakeId);

      const position = assetPositions.find((p) => p.stakeId === stakeId);
      const unstakeAmount = position?.amount ?? "0";

      try {
        await unstakeAsync({
          walletAddress: address,
          amount: unstakeAmount,
          asset,
          stakeId,
        });
      } catch {
        // Error is captured in unstakeError
      } finally {
        setUnstakingId(null);
      }
    },
    [address, asset, assetPositions, unstakeAsync, resetUnstake],
  );

  // No address yet
  if (!address) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-4",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-white">
            {symbol} Staking
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Provision a Nex Wallet to start staking.
        </p>
      </div>
    );
  }

  const isLoading = positionsLoading || rewardsLoading;
  const error = positionsError || stakeError || unstakeError;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-4",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-white">
            {symbol} Staking
          </span>
          {avgApy > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] text-green-400 border-green-400/30"
            >
              <TrendingUp className="h-2.5 w-2.5" />
              {avgApy.toFixed(1)}% APY
            </Badge>
          )}
        </div>

        {!showStakeForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetStake();
              setShowStakeForm(true);
            }}
            disabled={isStaking}
            className="text-xs"
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Stake
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-400">
            {error.message}
          </p>
        </div>
      )}

      {/* Rewards Summary */}
      {hasPositions && totalRewardsForAsset !== "0" && (
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Total Rewards Earned
          </span>
          <span className="text-sm font-medium tabular-nums text-green-400">
            +{formatBaseUnits(totalRewardsForAsset, getDecimals(asset))} {symbol}
          </span>
        </div>
      )}

      {/* Stake Form */}
      {showStakeForm && (
        <StakeForm
          asset={asset}
          onStake={handleStake}
          onCancel={() => {
            resetStake();
            setShowStakeForm(false);
          }}
          isStaking={isStaking}
        />
      )}

      {/* Loading state */}
      {isLoading && !hasPositions && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Positions */}
      {hasPositions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Positions ({activePositions.length} active)
          </p>
          {assetPositions.map((position) => (
            <PositionRow
              key={position.stakeId}
              position={position}
              asset={asset}
              onUnstake={handleUnstake}
              isUnstaking={isUnstaking && unstakingId === position.stakeId}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasPositions && !showStakeForm && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              No {symbol} staking positions
            </p>
            <p className="text-xs text-muted-foreground/70">
              Stake your {symbol} to earn rewards
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
