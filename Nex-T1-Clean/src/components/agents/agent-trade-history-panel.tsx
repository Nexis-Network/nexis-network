"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { NexAgentAvatar } from "@/components/agents/agent-avatar";
import { TablePagination } from "@/components/ai-leaderboard/table-pagination";
import { DETAIL_TRADES_PAGE_SIZE } from "@/components/ai-leaderboard/ai-leaderboard.constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAiLeaderboardAgentDetailQuery } from "@/lib/api/ai-leaderboard";
import { cn } from "@/lib/utils";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";

import type { RangeOption } from "@/types/ai-leaderboard";

type AgentTradeHistoryPanelProps = {
  agentId: string;
};

export function AgentTradeHistoryPanel({ agentId }: AgentTradeHistoryPanelProps) {
  const [range, setRange] = useState<RangeOption>("30d");
  const [page, setPage] = useState(1);

  const { evmAddress: cdpEvmAddr } = useResolvedCdpWallets();
  const detailQuery = useAiLeaderboardAgentDetailQuery({ agentId, range });
  const payload = detailQuery.error ? null : detailQuery.data ?? null;
  const error = detailQuery.error
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : "Failed to load trades"
    : null;
  const loading = detailQuery.isFetching && !payload;

  useEffect(() => {
    setPage(1);
  }, [agentId, range]);

  const pageSize = DETAIL_TRADES_PAGE_SIZE;
  const rows = useMemo(() => {
    const trades = payload?.trades ?? [];
    const start = (page - 1) * pageSize;
    return trades.slice(start, start + pageSize);
  }, [payload?.trades, page, pageSize]);
  const total = payload?.trades?.length ?? 0;

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <NexAgentAvatar
            agentId={agentId}
            fallbackLabel="Agent"
            className="mt-0.5"
            size={32}
            animated={false}
          />
          <div>
            <CardTitle className="text-base text-white">Trade history</CardTitle>
            <p className="text-xs text-muted-foreground/70">
              {payload?.redacted ? "Redacted for private agent access." : "Latest executions from the unified trade ledger."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cdpEvmAddr && (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
              CDP: {cdpEvmAddr.slice(0, 6)}...{cdpEvmAddr.slice(-4)}
            </span>
          )}
          {(["7d", "30d", "90d"] as RangeOption[]).map((option) => (
            <Button
              key={option}
              variant={range === option ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 px-3 text-xs", range === option ? "text-white" : "text-muted-foreground")}
              onClick={() => setRange(option)}
            >
              {option.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-64 text-sm text-destructive">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground/70">No trades recorded yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Notional</TableHead>
                  <TableHead className="text-right">P&amp;L</TableHead>
                  <TableHead className="text-right">Cum P&amp;L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((trade) => {
                  const pair =
                    trade.baseAsset && trade.quoteAsset ? `${trade.baseAsset}/${trade.quoteAsset}` : "—";
                  const pnl = trade.pnlUsd ?? 0;
                  const cumulative = trade.cumulativePnlUsd ?? null;
                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatTime(trade.executedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{trade.venue ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{pair}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{trade.side ?? (payload?.redacted ? "—" : "—")}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-normal text-muted-foreground">
                        {trade.notionalUsd != null ? formatCurrency(trade.notionalUsd) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={cn("font-mono font-normal", pnl >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatCurrency(pnl)}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {cumulative != null ? (
                          <span className={cn("font-mono font-normal", cumulative >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatCurrency(cumulative)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  });
  return formatter.format(value);
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
