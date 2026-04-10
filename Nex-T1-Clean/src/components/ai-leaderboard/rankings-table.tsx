"use client";

import { Info, Loader2, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LeaderboardFilterSelect } from "./leaderboard-filter-select";
import { TablePagination } from "./table-pagination";
import { formatCompact, formatSignedPercent, formatUsd } from "./ai-leaderboard.utils";
import type { ArenaRankingAgent, RankingSortBy, RankingTimeframe } from "@/types/ai-leaderboard";

const RANKINGS_PAGE_SIZE = 20;

const RANKING_TABS: { value: RankingSortBy; label: string }[] = [
  { value: "pnl", label: "P&L" },
  { value: "roi", label: "ROI" },
  { value: "winrate", label: "Win Rate" },
  { value: "sharpe", label: "Risk-Adjusted" },
  { value: "volume", label: "Volume" },
  { value: "aum", label: "AUM" },
];

function getRankForSort(agent: ArenaRankingAgent, sortBy: RankingSortBy): number {
  switch (sortBy) {
    case "pnl": return agent.pnlRank;
    case "roi": return agent.roiRank;
    case "winrate": return agent.winrateRank;
    case "sharpe": return agent.sharpeRank;
    case "volume": return agent.volumeRank;
    case "aum": return agent.aumRank;
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-400">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-300/20 text-xs font-semibold text-slate-300">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-orange-400/20 text-xs font-semibold text-orange-400">
        3
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">#{rank}</span>;
}

function RiskMetricsTooltip({ agent }: { agent: ArenaRankingAgent }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground">
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Sortino Ratio</span>
            <span className="font-medium text-foreground">
              {agent.sortinoRatio != null ? agent.sortinoRatio.toFixed(2) : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Max Drawdown</span>
            <span className="font-medium text-rose-400">
              {agent.maxDrawdownPercent != null ? `-${Math.abs(agent.maxDrawdownPercent).toFixed(2)}%` : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Sharpe Ratio</span>
            <span className="font-medium text-foreground">
              {agent.sharpeRatio != null ? agent.sharpeRatio.toFixed(2) : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-medium text-foreground">
              {agent.winRatePercent != null ? `${agent.winRatePercent.toFixed(1)}%` : "N/A"}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

type RankingsTableProps = {
  rankingSortBy: RankingSortBy;
  onSortByChange: (value: RankingSortBy) => void;
  rankingTimeframe: RankingTimeframe;
  onTimeframeChange: (value: RankingTimeframe) => void;
  rankingsPage: number;
  onPageChange: (page: number) => void;
  agents: ArenaRankingAgent[];
  total: number;
  isLoading: boolean;
  error: string | null;
  onSelectAgent: (agentId: string) => void;
};

export { RANKINGS_PAGE_SIZE };

export function RankingsTable({
  rankingSortBy,
  onSortByChange,
  rankingTimeframe,
  onTimeframeChange,
  rankingsPage,
  onPageChange,
  agents,
  total,
  isLoading,
  error,
  onSelectAgent,
}: RankingsTableProps) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-border/50 bg-card/40">
      <div className="flex flex-col gap-3 border-b border-border/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-400" />
              <h2 className="text-sm font-medium text-foreground">Agent Rankings</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-dimensional rankings across P&amp;L, ROI, risk-adjusted metrics, volume, and AUM.
            </p>
          </div>
          <LeaderboardFilterSelect
            label="Timeframe"
            value={rankingTimeframe}
            onValueChange={(value) => onTimeframeChange(value as RankingTimeframe)}
            options={[
              { value: "all", label: "All Time" },
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
            ]}
            triggerClassName="min-w-[120px]"
          />
        </div>
        <Tabs value={rankingSortBy} onValueChange={(value) => onSortByChange(value as RankingSortBy)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {RANKING_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading && agents.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-5 text-sm text-destructive">{error}</div>
      ) : agents.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          No ranking data available yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background/30">
              <TableRow className="border-border/40">
                <TableHead className="h-11 w-12 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Rank
                </TableHead>
                <TableHead className="h-11 min-w-[180px] px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Agent
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Total P&amp;L
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  ROI
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Win %
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Sharpe
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Max DD
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Portfolio
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  AUM
                </TableHead>
                <TableHead className="h-11 w-8 px-2 text-xs font-medium text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => {
                const rank = getRankForSort(agent, rankingSortBy);
                return (
                  <TableRow
                    key={agent.agentId}
                    className="cursor-pointer border-border/40 hover:bg-background/40"
                    onClick={() => onSelectAgent(agent.agentId)}
                  >
                    <TableCell className="px-3">
                      <RankBadge rank={rank} />
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          {agent.avatarUrl ? (
                            <AvatarImage src={agent.avatarUrl} alt={agent.agentName} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                            {agent.agentName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{agent.agentName}</span>
                            {agent.visibility !== "public" ? (
                              <Badge
                                variant="outline"
                                className="border-border/50 bg-background/40 text-[10px] text-muted-foreground"
                              >
                                {agent.visibility}
                              </Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-muted-foreground">{agent.agentSlug}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm">
                      <span className={agent.totalPnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {formatUsd(agent.totalPnlUsd)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm">
                      {agent.roiPercent != null ? (
                        <span className={agent.roiPercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {formatSignedPercent(agent.roiPercent)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm text-muted-foreground">
                      {agent.winRatePercent != null ? `${agent.winRatePercent.toFixed(1)}%` : "--"}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm text-muted-foreground">
                      {agent.sharpeRatio != null ? agent.sharpeRatio.toFixed(2) : "--"}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm">
                      {agent.maxDrawdownPercent != null ? (
                        <span className="text-rose-400">
                          -{Math.abs(agent.maxDrawdownPercent).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm text-muted-foreground">
                      {formatCompact(agent.portfolioValueUsd)}
                    </TableCell>
                    <TableCell className="px-3 text-right text-sm text-muted-foreground">
                      {formatCompact(agent.aumUsd)}
                    </TableCell>
                    <TableCell className="px-2">
                      <RiskMetricsTooltip agent={agent} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <TablePagination
        variant="footer"
        page={rankingsPage}
        pageSize={RANKINGS_PAGE_SIZE}
        total={total}
        onPageChange={onPageChange}
      />
    </section>
  );
}
