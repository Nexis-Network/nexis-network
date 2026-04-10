"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Loader2 } from "lucide-react";

import { AgentDetailPanel } from "@/components/ai-leaderboard/agent-detail-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeaderboardFilterSelect, type FilterOption } from "@/components/ai-leaderboard/leaderboard-filter-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ai-leaderboard/table-pagination";
import {
  AGENTS_PAGE_SIZE,
  COLORS,
  TRADES_PAGE_SIZE,
} from "@/components/ai-leaderboard/ai-leaderboard.constants";
import {
  aggregateCurvePoints,
  formatChainLabel,
  formatCurrency,
  formatPercent,
  formatShortDate,
  formatTime,
} from "@/components/ai-leaderboard/ai-leaderboard.utils";
import {
  useAiLeaderboardAgentDetailQuery,
  useAiLeaderboardQuery,
  useArenaRankingsQuery,
} from "@/lib/api/ai-leaderboard";
import { getChainIconById } from "@/lib/chain-icons";

import type { IntervalOption, LeaderboardAgent, RangeOption, RankingSortBy, RankingTimeframe } from "@/types/ai-leaderboard";

import { LeaderboardChart } from "./leaderboard-chart";
import { RankingsTable, RANKINGS_PAGE_SIZE } from "./rankings-table";

export function AiLeaderboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [interval, setInterval] = useState<IntervalOption>("day");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [hiddenAgentIds, setHiddenAgentIds] = useState<Set<string>>(new Set());
  const [agentsPage, setAgentsPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Multi-dimensional ranking state
  const [rankingSortBy, setRankingSortBy] = useState<RankingSortBy>("pnl");
  const [rankingTimeframe, setRankingTimeframe] = useState<RankingTimeframe>("all");
  const [rankingsPage, setRankingsPage] = useState(1);

  const leaderboardQuery = useAiLeaderboardQuery({ range, top: 10 });
  const payload = leaderboardQuery.error ? null : leaderboardQuery.data ?? null;
  const error = leaderboardQuery.error
    ? leaderboardQuery.error instanceof Error
      ? leaderboardQuery.error.message
      : "Failed to load leaderboard"
    : null;
  const [loading, setLoading] = useState(() => !payload);

  const detailQuery = useAiLeaderboardAgentDetailQuery({ agentId: selectedAgentId, range });
  const agentDetail = detailQuery.error ? null : detailQuery.data ?? null;
  const detailLoading = detailQuery.isFetching;

  // Arena rankings query
  const rankingsOffset = (rankingsPage - 1) * RANKINGS_PAGE_SIZE;
  const rankingsQuery = useArenaRankingsQuery({
    sortBy: rankingSortBy,
    timeframe: rankingTimeframe,
    limit: RANKINGS_PAGE_SIZE,
    offset: rankingsOffset,
  });
  const rankingsPayload = rankingsQuery.error ? null : rankingsQuery.data ?? null;
  const rankingsError = rankingsQuery.error
    ? rankingsQuery.error instanceof Error
      ? rankingsQuery.error.message
      : "Failed to load rankings"
    : null;
  const rankingsTotal = rankingsPayload?.total ?? 0;

  useEffect(() => {
    setRankingsPage(1);
  }, [rankingSortBy, rankingTimeframe]);

  useEffect(() => {
    setLoading(true);
  }, [range]);

  useEffect(() => {
    if (!leaderboardQuery.isFetching) {
      setLoading(false);
    }
  }, [leaderboardQuery.isFetching]);

  useEffect(() => {
    setHiddenAgentIds(new Set());
    setAgentsPage(1);
    setTradesPage(1);
  }, [range]);

  useEffect(() => {
    if (agentFilter === "all") return;
    const known = (payload?.agents ?? []).some((agent) => agent.id === agentFilter);
    if (!known) {
      setAgentFilter("all");
    }
  }, [payload?.agents, agentFilter]);

  const agentIndex = useMemo(() => {
    const map = new Map<string, LeaderboardAgent>();
    for (const agent of payload?.agents ?? []) {
      map.set(agent.id, agent);
    }
    return map;
  }, [payload?.agents]);

  const visibleAgentIds = useMemo(() => {
    const ids = (payload?.agents ?? []).map((agent) => agent.id);
    if (agentFilter !== "all") {
      return ids.includes(agentFilter) ? [agentFilter] : [];
    }
    return ids.filter((id) => !hiddenAgentIds.has(id));
  }, [payload?.agents, agentFilter, hiddenAgentIds]);

  const colorByAgentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const [index, curve] of (payload?.curves ?? []).entries()) {
      map.set(curve.agentId, COLORS[index % COLORS.length]);
    }
    return map;
  }, [payload?.curves]);

  const filteredCurves = useMemo(() => {
    const visible = new Set(visibleAgentIds);
    return (payload?.curves ?? [])
      .filter((curve) => visible.has(curve.agentId))
      .map((curve) => ({
        ...curve,
        points: aggregateCurvePoints(curve.points, interval),
      }));
  }, [payload?.curves, visibleAgentIds, interval]);

  const chartData = useMemo(() => {
    const merged = new Map<string, Record<string, UntypedJson>>();
    for (const curve of filteredCurves) {
      for (const point of curve.points) {
        const existing = merged.get(point.t) ?? { bucket: point.t };
        existing[curve.agentId] = point.pnlUsd;
        merged.set(point.t, existing);
      }
    }
    return Array.from(merged.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  }, [filteredCurves]);

  const seriesMeta = useMemo(() => {
    return filteredCurves.map((curve) => ({
      agentId: curve.agentId,
      name: curve.name,
      redacted: curve.redacted,
      color: colorByAgentId.get(curve.agentId) ?? COLORS[0],
    }));
  }, [filteredCurves, colorByAgentId]);

  const availableChains = useMemo(() => {
    const seen = new Set<number>();
    for (const trade of payload?.trades ?? []) {
      if (typeof trade.chainId === "number") {
        seen.add(trade.chainId);
      }
    }
    return Array.from(seen).sort((a, b) => a - b);
  }, [payload?.trades]);

  useEffect(() => {
    if (chainFilter === "all") return;
    const known = availableChains.some((id) => String(id) === chainFilter);
    if (!known) {
      setChainFilter("all");
    }
  }, [availableChains, chainFilter]);

  useEffect(() => {
    setTradesPage(1);
  }, [agentFilter, chainFilter]);

  const filteredTrades = useMemo(() => {
    let trades = payload?.trades ?? [];
    if (agentFilter !== "all") {
      trades = trades.filter((trade) => trade.agentId === agentFilter);
    }
    if (chainFilter !== "all") {
      trades = trades.filter((trade) => String(trade.chainId) === chainFilter);
    }
    return trades;
  }, [payload?.trades, agentFilter, chainFilter]);

  const agentsTotal = payload?.agents?.length ?? 0;
  const agentsPageCount = Math.max(1, Math.ceil(agentsTotal / AGENTS_PAGE_SIZE));
  const safeAgentsPage = Math.min(Math.max(1, agentsPage), agentsPageCount);
  const pagedAgents = useMemo(() => {
    const start = (safeAgentsPage - 1) * AGENTS_PAGE_SIZE;
    return (payload?.agents ?? []).slice(start, start + AGENTS_PAGE_SIZE);
  }, [payload?.agents, safeAgentsPage]);

  const tradesTotal = filteredTrades.length;
  const tradesPageCount = Math.max(1, Math.ceil(tradesTotal / TRADES_PAGE_SIZE));
  const safeTradesPage = Math.min(Math.max(1, tradesPage), tradesPageCount);
  const pagedTrades = useMemo(() => {
    const start = (safeTradesPage - 1) * TRADES_PAGE_SIZE;
    return filteredTrades.slice(start, start + TRADES_PAGE_SIZE);
  }, [filteredTrades, safeTradesPage]);

  useEffect(() => {
    if (agentsPage !== safeAgentsPage) {
      setAgentsPage(safeAgentsPage);
    }
  }, [agentsPage, safeAgentsPage]);

  useEffect(() => {
    if (tradesPage !== safeTradesPage) {
      setTradesPage(safeTradesPage);
    }
  }, [tradesPage, safeTradesPage]);

  const agentFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Agents" },
      ...(payload?.agents ?? []).map((agent) => ({
        value: agent.id,
        label: agent.redacted ? `${agent.name} (redacted)` : agent.name,
      })),
    ],
    [payload?.agents],
  );

  const chainFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Networks" },
      ...availableChains.map((chainId) => ({
        value: String(chainId),
        label: formatChainLabel(chainId),
      })),
    ],
    [availableChains],
  );

  const rangeOptions = useMemo<FilterOption[]>(
    () => [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
    [],
  );

  const intervalOptions = useMemo<FilterOption[]>(
    () => [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
    ],
    [],
  );

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-regular tracking-tight text-foreground sm:text-4xl">Agent Arena</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Compare agent performance, equity curves, and recent trades with server-enforced redaction for private agents.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
              <Link href="/marketplace">Marketplace</Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-8 px-3 text-xs">
              <Link href="/agents/new">Create agent</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              Since {payload ? formatShortDate(payload.since) : "--"}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span>{payload ? `${payload.agents.length} agents` : "Loading…"}</span>
          </div>
        </div>
      </header>

      <section className="flex flex-col rounded-[14px] border border-border/50 bg-card/40">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/40 px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <LeaderboardFilterSelect
              label="Date Range"
              value={range}
              onValueChange={(value) => setRange(value as RangeOption)}
              options={rangeOptions}
              triggerClassName="min-w-[160px]"
            />
            <LeaderboardFilterSelect
              label="Applications"
              value={agentFilter}
              onValueChange={setAgentFilter}
              options={agentFilterOptions}
              triggerClassName="min-w-[220px]"
            />
            <LeaderboardFilterSelect
              label="Networks"
              value={chainFilter}
              onValueChange={setChainFilter}
              options={chainFilterOptions}
              triggerClassName="min-w-[180px]"
            />
            <LeaderboardFilterSelect
              label="Interval"
              value={interval}
              onValueChange={(value) => setInterval(value as IntervalOption)}
              options={intervalOptions}
              triggerClassName="min-w-[140px]"
            />
          </div>
          <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.24px]">Trades</span>
              <span className="text-foreground">{filteredTrades.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.24px]">Top</span>
              <span className="text-foreground">{payload?.top ?? 10}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <LeaderboardChart
            loading={loading}
            error={error}
            chartData={chartData}
            seriesMeta={seriesMeta}
            interval={interval}
            agents={payload?.agents ?? []}
            agentFilter={agentFilter}
            hiddenAgentIds={hiddenAgentIds}
            colorByAgentId={colorByAgentId}
            onClearFilter={() => setAgentFilter("all")}
            onToggleAgent={(agentId) => {
              if (agentFilter !== "all") {
                setAgentFilter(agentId);
                return;
              }
              setHiddenAgentIds((prev) => {
                const next = new Set(prev);
                if (next.has(agentId)) {
                  next.delete(agentId);
                } else {
                  next.add(agentId);
                }
                return next;
              });
            }}
          />
        </div>
      </section>

      <RankingsTable
        rankingSortBy={rankingSortBy}
        onSortByChange={setRankingSortBy}
        rankingTimeframe={rankingTimeframe}
        onTimeframeChange={setRankingTimeframe}
        rankingsPage={rankingsPage}
        onPageChange={setRankingsPage}
        agents={rankingsPayload?.agents ?? []}
        total={rankingsTotal}
        isLoading={rankingsQuery.isFetching}
        error={rankingsError}
        onSelectAgent={setSelectedAgentId}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Legacy ranked agents (P&L) */}
        <section className="overflow-hidden rounded-[14px] border border-border/50 bg-card/40">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">Ranked agents</h2>
              <p className="text-xs text-muted-foreground">Sorted by realized P&amp;L.</p>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-background/30">
              <TableRow className="border-border/40">
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  #
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Agent
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  P&amp;L
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Trades
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Win %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAgents.map((agent, index) => (
                <TableRow
                  key={agent.id}
                  className="cursor-pointer border-border/40 hover:bg-background/40"
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <TableCell className="px-3 text-xs text-muted-foreground">
                    #{(safeAgentsPage - 1) * AGENTS_PAGE_SIZE + index + 1}
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{agent.name}</span>
                        {agent.redacted ? (
                          <Badge
                            variant="outline"
                            className="border-border/50 bg-background/40 text-[10px] text-muted-foreground"
                          >
                            Redacted
                          </Badge>
                        ) : null}
                        {agent.visibility !== "public" ? (
                          <Badge
                            variant="outline"
                            className="border-border/50 bg-background/40 text-[10px] text-muted-foreground"
                          >
                            {agent.visibility}
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{agent.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm">
                    <span className={agent.performance.realizedPnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {formatCurrency(agent.performance.realizedPnlUsd)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-right text-sm text-muted-foreground">{agent.performance.totalTrades}</TableCell>
                  <TableCell className="px-3 text-right text-sm text-muted-foreground">
                    {agent.performance.winRatePercent == null ? "—" : formatPercent(agent.performance.winRatePercent)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            variant="footer"
            page={agentsPage}
            pageSize={AGENTS_PAGE_SIZE}
            total={agentsTotal}
            onPageChange={setAgentsPage}
          />
        </section>

        <section className="overflow-hidden rounded-[14px] border border-border/50 bg-card/40">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">Recent trades</h2>
              <p className="text-xs text-muted-foreground">
                Filtered by selected agent/network. Redacted rows hide trade details for private agents.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-background/30">
              <TableRow className="border-border/40">
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Time
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Agent
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Venue
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Chain
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Side
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Pair
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Notional
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  P&amp;L
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                  Fees
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradesTotal === 0 ? (
                <TableRow className="border-border/40">
                  <TableCell className="px-3 py-10 text-sm text-muted-foreground" colSpan={9}>
                    No trades recorded for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                pagedTrades.map((trade) => {
                  const agent = agentIndex.get(trade.agentId);
                  const pair = trade.baseAsset && trade.quoteAsset ? `${trade.baseAsset}/${trade.quoteAsset}` : "—";
                  const pnl = trade.pnlUsd ?? null;
                  const chainLabel = formatChainLabel(trade.chainId);
                  const chainIcon = trade.chainId ? getChainIconById(trade.chainId) : null;

                  return (
                    <TableRow key={trade.id} className="border-border/40 hover:bg-background/40">
                      <TableCell className="px-3 text-xs text-muted-foreground">{formatTime(trade.executedAt)}</TableCell>
                      <TableCell className="px-3">
                        <button
                          type="button"
                          className="text-left text-sm text-foreground hover:text-primary"
                          onClick={() => setSelectedAgentId(trade.agentId)}
                        >
                          {agent?.name ?? trade.agentId}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 text-sm text-muted-foreground">{trade.venue ?? "—"}</TableCell>
                      <TableCell className="px-3">
                        {chainIcon ? (
                          <div className="flex items-center gap-2">
                            <Image
                              src={chainIcon}
                              alt={`${chainLabel} icon`}
                              width={16}
                              height={16}
                              className="rounded-md"
                            />
                            <span className="text-sm text-muted-foreground">{chainLabel}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-sm text-muted-foreground">{trade.side ? trade.side.toUpperCase() : "—"}</TableCell>
                      <TableCell className="px-3 text-sm text-muted-foreground">{pair}</TableCell>
                      <TableCell className="px-3 text-right text-sm text-muted-foreground">
                        {trade.notionalUsd == null ? "—" : formatCurrency(trade.notionalUsd)}
                      </TableCell>
                      <TableCell className="px-3 text-right text-sm">
                        {pnl == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatCurrency(pnl)}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-right text-sm text-muted-foreground">
                        {trade.feesUsd == null ? "—" : formatCurrency(trade.feesUsd)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            variant="footer"
            page={tradesPage}
            pageSize={TRADES_PAGE_SIZE}
            total={tradesTotal}
            onPageChange={setTradesPage}
          />
        </section>
      </div>

      <Dialog open={Boolean(selectedAgentId)} onOpenChange={(open) => (open ? null : setSelectedAgentId(null))}>
        <DialogContent
          className="border-border/50 bg-background text-foreground"
          style={{ maxWidth: "min(56rem, calc(100% - 2rem))" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base text-foreground">Agent details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !agentDetail ? (
            <div className="text-sm text-muted-foreground">Unable to load agent detail.</div>
          ) : (
            <AgentDetailPanel
              agent={agentIndex.get(agentDetail.agentId) ?? null}
              detail={agentDetail}
              onClose={() => setSelectedAgentId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Note: formatting + aggregation helpers live in ai-leaderboard.utils.ts
