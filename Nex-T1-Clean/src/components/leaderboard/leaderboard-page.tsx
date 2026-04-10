"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Radio, Zap } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { formatNumber, formatUsd } from "@/lib/utils/number";
import { useLeaderboardQuery } from "@/lib/api/leaderboard";

import { LeaderboardTable } from "./leaderboard-table";

const formatUpdatedLabel = (iso: string | null | undefined): string => {
  if (!iso) {
    return "Awaiting first update";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Updated recently";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
};

export function LeaderboardPage() {
  const { data, isLoading, isError, isFetching, refetch, error } = useLeaderboardQuery();
  const [page, setPage] = useState(1);

  const allEntries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const PAGE_SIZE = 25;
  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [allEntries.length]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return allEntries.slice(start, end);
  }, [allEntries, currentPage]);

  const stats = useMemo(() => {
    if (!allEntries.length) {
      return {
        totalVolume: 0,
        totalReferralFees: 0,
        averageXp: 0,
        uniqueChains: 0,
        monthlyPrizePool: 0,
      };
    }

    let volumeTotal = 0;
    let referralTotal = 0;
    let xpTotal = 0;
    let totalFees = 0;
    const chainSet = new Set<string>();

    for (const entry of allEntries) {
      volumeTotal += entry.volumeUsd;
      referralTotal += entry.referralFeesUsd;
      xpTotal += entry.xp;
      totalFees += entry.referralFeesUsd;
      entry.activeChains.forEach((chain) => chainSet.add(chain.toLowerCase()));
    }

    return {
      totalVolume: volumeTotal,
      totalReferralFees: referralTotal,
      averageXp: xpTotal / allEntries.length,
      uniqueChains: chainSet.size,
      monthlyPrizePool: totalFees * 0.1,
    };
  }, [allEntries]);

  const isBusy = isLoading || isFetching;

  const handlePageChange = (nextPage: number) => {
    setPage((previous) => {
      const target = Math.max(1, Math.min(nextPage, totalPages));
      if (target === previous) return previous;
      return target;
    });
  };

  return (
    <DashboardShell>
      <div className="flex h-full flex-col overflow-hidden border border-border/10 bg-background">
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 overflow-y-auto px-4 pb-10 pt-6 sm:px-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-regular tracking-tight text-foreground md:text-3xl">
                Nexis Leaderboard
              </h1>
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1.5",
                  data?.source === "realtime" 
                    ? "border-emerald-500/30 bg-[#8eb94f]/10 text-[#8eb94f] animate-pulse"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                )}
              >
                <Radio className="size-3" />
                {data?.source === "realtime" ? "Live" : "Sample Data"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Track the top 100 wallets ranked by real-time PnL, XP, referral performance, and cross-chain activity.
            </p>
            <p className="text-xs text-muted-foreground/80">
              {formatUpdatedLabel(data?.updatedAt)}
              {data?.sampleSize ? ` • Data sample: ${formatNumber(data.sampleSize)} wallets` : ""}
              {data?.entries?.length ? ` • ${data.entries.length} users ranked` : ""}
              {data?.source === "seeded" ? " • Claim XP to appear on the leaderboard!" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Zap className="size-3 text-amber-500" />
              Claim XP Daily
            </Badge>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => refetch()}
              disabled={isBusy}
            >
              <RefreshCw className={cn("size-4", isBusy && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume (Top 100)
              </CardTitle>
              <CardDescription>Aggregate trading volume across all tracked chains.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-regular">{formatUsd(stats.totalVolume, { compact: true })}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Referral Fees Earned
              </CardTitle>
              <CardDescription>Total referral revenue from the leaderboard cohort.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-regular">{formatUsd(stats.totalReferralFees, { compact: true })}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average XP
              </CardTitle>
              <CardDescription>XP earned per wallet (top 100 average).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-regular">{formatNumber(stats.averageXp, { maximumFractionDigits: 0 })}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Prizes
              </CardTitle>
              <CardDescription>Monthly prize pool distributed between the top 100 leaderboard users.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-regular">
                {formatUsd(stats.monthlyPrizePool, { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="flex-1 min-h-0">
          {isError ? (
            <Alert variant="destructive" className="border border-destructive/40 bg-destructive/10">
              <AlertTitle>Unable to load leaderboard</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "An unexpected error occurred. Please try again later."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-4">
              <LeaderboardTable entries={paginatedEntries} isLoading={isBusy} />
              {totalPages > 1 ? (
                <Pagination className="justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
                        className={cn("min-w-[90px]", currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={pageNumber === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              handlePageChange(pageNumber);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                        className={cn("min-w-[80px]", currentPage === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          )}
        </div>
        </div>
      </div>
    </DashboardShell>
  );
}
