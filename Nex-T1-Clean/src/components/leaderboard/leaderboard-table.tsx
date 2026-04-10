"use client";

import { memo, useMemo } from "react";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, truncateAddress } from "@/lib/utils";
import { formatNumber, formatSignedUsd, formatUsd } from "@/lib/utils/number";
import type { LeaderboardEntry } from "@/types/leaderboard";

import { ActiveChainIcons } from "./active-chain-icons";
import { RankBadge } from "./rank-badge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  className?: string;
};

const walletLabel = (entry: LeaderboardEntry) => {
  if (entry.displayName) {
    return entry.displayName;
  }
  return truncateAddress(entry.walletAddress, 6, 6);
};

const WalletTypeBadge = memo(({ type }: { type: LeaderboardEntry["walletType"] }) => {
  const isSolana = type === "solana";

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border px-2 py-0 text-[11px] font-regular uppercase tracking-wide",
        isSolana
          ? "border border-border bg-muted text-foreground"
          : "bg-emerald-300/10 text-emerald-300 border-emerald-300/20",
      )}
    >
      {isSolana ? (
        <span className="bg-[linear-gradient(135deg,#DC1FFF_0%,#7D58FF_35%,#03E1FF_70%,#00FFA3_100%)] bg-clip-text text-transparent">
          Solana
        </span>
      ) : (
        "EVM"
      )}
    </Badge>
  );
});
WalletTypeBadge.displayName = "WalletTypeBadge";

const LoadingRow = () => (
  <TableRow className="animate-pulse bg-card">
    <TableCell className="w-[42px] py-5 text-center">
      <div className="mx-auto h-7 w-9 rounded-full bg-muted/60" />
    </TableCell>
    <TableCell>
      <div className="mb-2 h-4 w-48 rounded bg-muted/60" />
      <div className="h-4 w-24 rounded bg-muted/40" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-20 rounded bg-muted/40" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-16 rounded bg-muted/40" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-20 rounded bg-muted/40" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-20 rounded bg-muted/40" />
    </TableCell>
  </TableRow>
);

export function LeaderboardTable({ entries, isLoading, className }: LeaderboardTableProps) {
  const rows = useMemo(() => {
    if (!entries.length) {
      return null;
    }
    return entries.map((entry) => (
      <TableRow
        key={`${entry.rank}-${entry.walletAddress}`}
        className="bg-card hover:bg-muted"
      >
        <TableCell className="w-[42px] font-medium text-center">
          <RankBadge rank={entry.rank} />
        </TableCell>
        <TableCell className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-regular text-sm">{walletLabel(entry)}</span>
            <WalletTypeBadge type={entry.walletType} />
          </div>
          <p className="text-xs text-muted-foreground">{entry.walletAddress}</p>
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "font-regular",
              entry.pnlUsd > 0 ? "text-[#8eb94f]" : entry.pnlUsd < 0 ? "text-rose-500" : "text-muted-foreground",
            )}
          >
            {formatSignedUsd(entry.pnlUsd, { maximumFractionDigits: 0 })}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{formatNumber(entry.xp)}</span>
            {entry.level ? (
              <span className="text-[10px] text-muted-foreground">Level {entry.level}</span>
            ) : null}
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium text-foreground">
            {formatUsd(entry.referralFeesUsd, { compact: true })}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium text-foreground">
            {formatUsd(entry.volumeUsd, { compact: true })}
          </span>
        </TableCell>
        <TableCell>
          <ActiveChainIcons chains={entry.activeChains} />
        </TableCell>
      </TableRow>
    ));
  }, [entries]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background/80 shadow-sm",
        className
      )}
    >
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[42px] text-center">Rank</TableHead>
              <TableHead className="min-w-[220px]">Wallet</TableHead>
              <TableHead className="w-[140px]">PnL (USD)</TableHead>
              <TableHead className="w-[120px]">XP</TableHead>
              <TableHead className="w-[150px]">Referral Fees</TableHead>
              <TableHead className="w-[150px]">Volume Traded</TableHead>
              <TableHead className="w-[180px]">Active Chains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !rows ? (
              <>
                {Array.from({ length: 6 }).map((_, index) => (
                  <LoadingRow key={`loading-${index}`} />
                ))}
              </>
            ) : rows}
          </TableBody>
        </Table>
      </div>
      {!isLoading && !rows ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t border-border/40 px-6 py-10 text-center text-sm text-muted-foreground">
          <p>No leaderboard data available yet.</p>
          <p className="text-xs text-muted-foreground/80">Check back soon once trading activity picks up.</p>
        </div>
      ) : null}
    </div>
  );
}
