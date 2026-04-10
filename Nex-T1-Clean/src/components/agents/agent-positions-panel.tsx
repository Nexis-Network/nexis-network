"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentPositions, type AgentPosition } from "@/lib/hooks/agents/use-agent-positions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentPositionsPanelProps = {
  agentId: string;
};

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  });
  return formatter.format(value);
}

function formatPrice(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) {
    return `$${value.toPrecision(4)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatQuantity(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.0001) return value.toExponential(2);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

function PositionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function PositionRow({ position }: { position: AgentPosition }) {
  const pnl = position.unrealizedPnlUsd;
  const pnlPct = position.unrealizedPnlPercent;
  const pnlColor = pnl >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <TableRow>
      <TableCell className="text-xs font-medium text-foreground">
        {position.token}
      </TableCell>
      <TableCell>
        <Badge
          variant={position.side === "long" ? "default" : "destructive"}
          className="text-[10px] px-1.5 py-0"
        >
          {position.side.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-right text-xs font-mono text-muted-foreground">
        {formatPrice(position.entryPrice)}
      </TableCell>
      <TableCell className="text-right text-xs font-mono text-muted-foreground">
        {formatPrice(position.currentPrice)}
      </TableCell>
      <TableCell className="text-right text-xs font-mono text-muted-foreground">
        {formatQuantity(position.quantity)}
      </TableCell>
      <TableCell className="text-right text-xs">
        <span className={cn("font-mono font-normal", pnlColor)}>
          {formatCurrency(pnl)}
        </span>
      </TableCell>
      <TableCell className="text-right text-xs">
        <span className={cn("font-mono font-normal", pnlColor)}>
          {formatPercent(pnlPct)}
        </span>
      </TableCell>
    </TableRow>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentPositionsPanel({ agentId }: AgentPositionsPanelProps) {
  const { data, isLoading, error } = useAgentPositions(agentId);

  const positions = data?.positions ?? [];
  const totalPnl = data?.totalUnrealizedPnlUsd ?? 0;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Failed to load positions"
    : null;

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base text-white">Open positions</CardTitle>
          <p className="text-xs text-muted-foreground/70">
            Active holdings and unrealized P&L across agent wallets.
          </p>
        </div>
        {positions.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground/70">Total Unrealized</p>
            <p
              className={cn(
                "text-sm font-mono font-medium",
                totalPnl >= 0 ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {formatCurrency(totalPnl)}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : errorMessage ? (
          <div className="flex h-64 items-center justify-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : positions.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground/70">
            No open positions.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unreal. P&amp;L</TableHead>
                  <TableHead className="text-right">P&amp;L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <PositionRow key={position.id} position={position} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Loading skeleton shown below if refetching but has data */}
        {isLoading && positions.length > 0 && <PositionsSkeleton />}
      </CardContent>
    </Card>
  );
}
