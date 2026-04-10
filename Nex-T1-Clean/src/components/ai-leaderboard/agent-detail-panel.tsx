"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DETAIL_TRADES_PAGE_SIZE } from "@/components/ai-leaderboard/ai-leaderboard.constants";
import { LeaderboardTooltipContent } from "@/components/ai-leaderboard/leaderboard-tooltip-content";
import { TablePagination } from "@/components/ai-leaderboard/table-pagination";
import {
  formatBucketLabel,
  formatChainLabel,
  formatCurrency,
  formatPercent,
  formatShortDate,
  formatTime,
} from "@/components/ai-leaderboard/ai-leaderboard.utils";
import { getChainIconById } from "@/lib/chain-icons";
import { cn } from "@/lib/utils";
import type { AgentDetailPayload, LeaderboardAgent } from "@/types/ai-leaderboard";

export function AgentDetailPanel({
  agent,
  detail,
  onClose,
}: {
  agent: LeaderboardAgent | null;
  detail: AgentDetailPayload;
  onClose: () => void;
}) {
  const [tradesPage, setTradesPage] = useState(1);
  const chartData = useMemo(
    () => detail.curve.map((p) => ({ bucket: p.t, pnlUsd: p.pnlUsd, trades: p.trades })),
    [detail.curve],
  );

  const tradesTotal = detail.trades.length;
  const tradesPageCount = Math.max(1, Math.ceil(tradesTotal / DETAIL_TRADES_PAGE_SIZE));
  const safeTradesPage = Math.min(Math.max(1, tradesPage), tradesPageCount);
  const pagedTrades = useMemo(() => {
    const start = (safeTradesPage - 1) * DETAIL_TRADES_PAGE_SIZE;
    return detail.trades.slice(start, start + DETAIL_TRADES_PAGE_SIZE);
  }, [detail.trades, safeTradesPage]);

  useEffect(() => {
    setTradesPage(1);
  }, [detail.agentId, detail.range]);

  useEffect(() => {
    if (tradesPage !== safeTradesPage) {
      setTradesPage(safeTradesPage);
    }
  }, [tradesPage, safeTradesPage]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-regular text-foreground">{agent?.name ?? detail.agentId}</span>
            {detail.redacted ? (
              <Badge variant="outline" className="border-border/50 bg-background/40 text-[10px] text-muted-foreground">
                Redacted
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Range: {detail.range.toUpperCase()}</span>
            <span className="text-muted-foreground/40">•</span>
            <span>Since {formatShortDate(detail.since)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground" onClick={onClose}>
          Close
        </Button>
      </div>

      {agent ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border/50 bg-background/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.24px] text-muted-foreground">Realized P&amp;L</div>
            <div
              className={cn(
                "text-sm font-medium",
                agent.performance.realizedPnlUsd >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {formatCurrency(agent.performance.realizedPnlUsd)}
            </div>
          </div>
          <div className="rounded-md border border-border/50 bg-background/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.24px] text-muted-foreground">Trades</div>
            <div className="text-sm font-medium text-foreground">{agent.performance.totalTrades}</div>
          </div>
          <div className="rounded-md border border-border/50 bg-background/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.24px] text-muted-foreground">Win Rate</div>
            <div className="text-sm font-medium text-foreground">
              {agent.performance.winRatePercent == null ? "—" : formatPercent(agent.performance.winRatePercent)}
            </div>
          </div>
          <div className="rounded-md border border-border/50 bg-background/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.24px] text-muted-foreground">Last Trade</div>
            <div className="text-sm font-medium text-foreground">
              {agent.performance.lastTradeAt ? formatShortDate(agent.performance.lastTradeAt) : "—"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="h-[320px] w-full rounded-[14px] border border-border/50 bg-background/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid-stroke)" />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#757575", fontSize: 12 }}
              minTickGap={16}
              tickFormatter={(value) => formatBucketLabel(String(value), "day")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#757575", fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value as number)}
            />
            <Tooltip content={<LeaderboardTooltipContent interval="day" />} />
            <Line
              type="linear"
              dataKey="pnlUsd"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              strokeMiterlimit={10}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--background))", stroke: "#38bdf8", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border/50 bg-background/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">Trades</span>
        </div>
        <Table>
          <TableHeader className="bg-background/40">
            <TableRow className="border-border/40">
              <TableHead className="h-11 px-3 text-xs font-medium uppercase tracking-[0.24px] text-muted-foreground">
                Time
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
                <TableCell className="px-3 py-10 text-sm text-muted-foreground" colSpan={8}>
                  No trades recorded for this agent yet.
                </TableCell>
              </TableRow>
            ) : (
              pagedTrades.map((trade) => {
                const pair = trade.baseAsset && trade.quoteAsset ? `${trade.baseAsset}/${trade.quoteAsset}` : "—";
                const pnl = trade.pnlUsd ?? null;
                const chainLabel = formatChainLabel(trade.chainId ?? null);
                const chainIcon = trade.chainId ? getChainIconById(trade.chainId) : null;

                return (
                  <TableRow key={trade.id} className="border-border/40 hover:bg-background/40">
                    <TableCell className="px-3 text-xs text-muted-foreground">{formatTime(trade.executedAt)}</TableCell>
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
                    <TableCell className="px-3 text-sm text-muted-foreground">
                      {trade.side ? trade.side.toUpperCase() : "—"}
                    </TableCell>
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
          pageSize={DETAIL_TRADES_PAGE_SIZE}
          total={tradesTotal}
          onPageChange={setTradesPage}
        />
      </div>
    </div>
  );
}

