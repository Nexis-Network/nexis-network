"use client";

import { ArrowDownRight, ArrowUpRight, Coins, Flame, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MoralisPriceChart } from "@/components/moralis/moralis-price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  useArtifactRegistryArtifact,
  useArtifactRuntime,
} from "@/lib/ai/artifact-runtime";
import { useCdpTransactions } from "@/lib/cdp/use-cdp-transactions";
import { cn } from "@/lib/utils";
import {
  PumpFunV2Artifact,
  type PumpFunV2ArtifactData,
} from "@/modules/ai/artifacts/pumpfun-v2";

type PumpfunOpportunityItem = Extract<
  PumpFunV2ArtifactData,
  { view: "opportunity-list" }
>["items"][number];

function formatCurrency(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCompactCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getActionStateLabel(state: string) {
  switch (state) {
    case "preparing":
      return "Preparing";
    case "awaiting_signature":
      return "Awaiting signature";
    case "submitted":
      return "Submitted";
    case "error":
      return "Retry";
    default:
      return null;
  }
}

export function PumpFunV2ArtifactPanel() {
  const { upsertArtifact } = useArtifactRuntime();
  const artifact = useArtifactRegistryArtifact<PumpFunV2ArtifactData>(
    PumpFunV2Artifact,
  );
  const artifactData = artifact.data ?? undefined;
  const [localData, setLocalData] = useState<PumpFunV2ArtifactData | null>(null);
  const [buyAmount, setBuyAmount] = useState("0.05");
  const [sellPercent, setSellPercent] = useState("25");
  const [inspectingMint, setInspectingMint] = useState<string | null>(null);
  const cdpTransactions = useCdpTransactions();

  useEffect(() => {
    setLocalData(null);
    setInspectingMint(null);
  }, [artifactData?.view, artifactData?.generatedAt]);

  useEffect(() => {
    if (!artifactData || artifactData.view === "opportunity-list") return;
    setBuyAmount(String(artifactData.actions.defaultBuyAmountSol));
    setSellPercent(String(artifactData.actions.defaultSellPercent));
  }, [artifactData]);

  const data = localData ?? artifactData;

  const persistArtifact = (nextData: PumpFunV2ArtifactData) => {
    const now = Date.now();
    upsertArtifact(PumpFunV2Artifact.id, {
      id: `${PumpFunV2Artifact.id}-artifact`,
      type: PumpFunV2Artifact.id,
      version: now,
      status: "complete" as const,
      createdAt: now,
      updatedAt: now,
      payload: nextData,
    });
  };

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Awaiting Pump.fun data...
      </div>
    );
  }

  const patchDashboard = (
    updater: (
      current: Exclude<PumpFunV2ArtifactData, { view: "opportunity-list" }>,
    ) => Exclude<PumpFunV2ArtifactData, { view: "opportunity-list" }>,
  ) => {
    setLocalData((previous) => {
      const current = (previous ?? data) as PumpFunV2ArtifactData;
      if (current.view === "opportunity-list") return current;
      const nextData = updater(current);
      persistArtifact(nextData);
      return nextData;
    });
  };

  const inspectToken = async (item: PumpfunOpportunityItem) => {
    if (data.view !== "opportunity-list") {
      return;
    }

    setInspectingMint(item.token.mint);

    try {
      const response = await fetch("/api/pumpfun/tokens/inspect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cluster: data.cluster,
          mint: item.token.mint,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          artifact?: Extract<PumpFunV2ArtifactData, { view: "token-dashboard" }>;
        };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success || !payload.data?.artifact) {
        throw new Error(payload.error?.message ?? "Failed to inspect token");
      }

      setBuyAmount(String(payload.data.artifact.actions.defaultBuyAmountSol));
      setSellPercent(String(payload.data.artifact.actions.defaultSellPercent));
      const nextData = {
        ...payload.data.artifact,
        score: item.score,
      };
      persistArtifact(nextData);
      setLocalData(nextData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to inspect token");
    } finally {
      setInspectingMint(null);
    }
  };

  const submitTrade = async (side: "buy" | "sell") => {
    if (data.view === "opportunity-list") {
      toast.error("Inspect a token before trading.");
      return;
    }

    if (data.cluster !== "mainnet-beta") {
      toast.error("Pump.fun execution is only enabled on mainnet-beta.");
      return;
    }

    if (!cdpTransactions.enabled || !cdpTransactions.solanaAddress) {
      toast.error("Connect your Nex Wallet (SOL) first.");
      return;
    }

    const nextStateKey = side === "buy" ? "buyState" : "sellState";

    patchDashboard((current) => ({
      ...current,
      actions: {
        ...current.actions,
        [nextStateKey]: "preparing",
        lastError: undefined,
      },
    }));

    try {
      const response = await fetch("/api/pumpfun/trades/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: side,
          cluster: data.cluster,
          mint: data.token.mint,
          buy:
            side === "buy"
              ? {
                  amountSol: Number(buyAmount),
                  slippageBps: data.actions.slippageBps,
                }
              : undefined,
          sell:
            side === "sell"
              ? {
                  percentOfPosition: Number(sellPercent),
                  slippageBps: data.actions.slippageBps,
                }
              : undefined,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: {
          transaction: string;
          transactionSummary?: {
            side: "buy" | "sell";
            solAmount?: number | null;
            tokenAmount?: number | null;
            walletAddress: string;
          };
        };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success || !payload.data?.transaction) {
        throw new Error(payload.error?.message ?? "Failed to prepare trade");
      }

      patchDashboard((current) => ({
        ...current,
        actions: {
          ...current.actions,
          [nextStateKey]: "awaiting_signature",
        },
      }));

      const result = await cdpTransactions.sendSolanaTransaction({
        transaction: payload.data.transaction,
      });

      const nextTransaction = {
        signature: result.transactionSignature,
        side,
        timestamp: new Date().toISOString(),
        valueUsd: undefined,
        solAmount: payload.data.transactionSummary?.solAmount ?? null,
        tokenAmount: payload.data.transactionSummary?.tokenAmount ?? null,
        walletAddress: payload.data.transactionSummary?.walletAddress ?? cdpTransactions.solanaAddress,
      };

      patchDashboard((current) => ({
        view: "trade-result",
        generatedAt: new Date().toISOString(),
        cluster: current.cluster,
        token: current.token,
        score: current.score,
        chart: current.chart,
        wallet: current.wallet,
        transactions: [nextTransaction, ...current.transactions].slice(0, 12),
        actions: {
          ...current.actions,
          buyState: side === "buy" ? "submitted" : current.actions.buyState,
          sellState: side === "sell" ? "submitted" : current.actions.sellState,
          lastSignature: result.transactionSignature,
          lastError: undefined,
        },
        result: {
          side,
          status: "submitted",
          signature: result.transactionSignature,
        },
      }));

      toast.success(
        `${side === "buy" ? "Buy" : "Sell"} submitted: ${result.transactionSignature.slice(0, 8)}...`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Trade failed";
      patchDashboard((current) => ({
        ...current,
        actions: {
          ...current.actions,
          [nextStateKey]: "error",
          lastError: message,
        },
      }));
      toast.error(message);
    }
  };

  if (data.view === "opportunity-list") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">
                Pump.fun Radar
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Top {data.universe} opportunities
              </h2>
            </div>
            <Badge variant="outline" className="border-amber-400/30 bg-amber-500/10 text-amber-200">
              {data.cluster}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Ranked with the deterministic memecoin scorer. Ask Nex to inspect a mint for full charting and trading controls.
          </p>
        </div>

        <div className="space-y-3">
          {data.items.map((item, index) => (
            <Card key={item.token.mint} className="border-border/50 bg-background/70">
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                    {item.token.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={item.token.symbol}
                        className="size-full object-cover"
                        src={item.token.logoUrl}
                      />
                    ) : (
                      <Coins className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <p className="font-medium text-foreground">
                        {item.token.name}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        ${item.token.symbol}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(item.token.priceUsd, 6)}</span>
                      <span>{formatCompactCurrency(item.token.marketCapUsd)} mcap</span>
                      <span>{formatPercent(item.token.migrationProgressPct)} migration</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.score.reasons.slice(0, 3).map((reason) => (
                        <Badge key={reason} variant="outline" className="border-border/60 text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Score
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {item.score.opportunityScore}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.score.confidence} confidence
                  </p>
                  <Button
                    className="mt-3"
                    disabled={inspectingMint === item.token.mint}
                    onClick={() => void inspectToken(item)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {inspectingMint === item.token.mint ? "Loading..." : "Open dashboard"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const buyLabel = getActionStateLabel(data.actions.buyState);
  const sellLabel = getActionStateLabel(data.actions.sellState);
  const tradingDisabled = data.cluster !== "mainnet-beta" || !cdpTransactions.solanaAddress;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.2),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-background/60">
              {data.token.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={data.token.symbol}
                  className="size-full object-cover"
                  src={data.token.logoUrl}
                />
              ) : (
                <Flame className="size-6 text-amber-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  {data.token.name}
                </h2>
                <Badge variant="outline" className="border-border/50 bg-background/50">
                  ${data.token.symbol}
                </Badge>
                {data.score ? (
                  <Badge className="bg-emerald-500/85 text-black hover:bg-emerald-500/85">
                    {data.score.opportunityScore} score
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatCurrency(data.token.priceUsd, 6)} current price
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.score?.reasons.slice(0, 3).map((reason) => (
                  <Badge key={reason} variant="secondary" className="bg-background/60 text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Till migration
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatPercent(data.token.migrationProgressPct)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50 bg-background/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Market cap
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCompactCurrency(data.token.marketCapUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-background/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              24h volume
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCompactCurrency(data.token.volume24hUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-background/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Liquidity
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatCompactCurrency(data.token.liquidityUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-background/70">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Wallet
              </p>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {cdpTransactions.solanaAddress
                ? `${cdpTransactions.solanaAddress.slice(0, 6)}...${cdpTransactions.solanaAddress.slice(-4)}`
                : "Not connected"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-background/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <MoralisPriceChart
            chainId="solana"
            defaultInterval={data.chart.defaultInterval}
            pairAddress={data.chart.pairAddress ?? undefined}
            tokenAddress={data.chart.tokenAddress ?? undefined}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-background/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-background/70 p-3 text-xs text-muted-foreground">
            {tradingDisabled
              ? "Connect your Nex Wallet (SOL) to enable trading."
              : "Trading signs in your Nex Wallet. The model never receives private keys."}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Buy</p>
                {buyLabel ? <Badge variant="outline">{buyLabel}</Badge> : null}
              </div>
              <Input
                inputMode="decimal"
                onChange={(event) => setBuyAmount(event.target.value)}
                value={buyAmount}
              />
              <Button
                className="w-full"
                disabled={tradingDisabled || !data.actions.canBuy}
                onClick={() => void submitTrade("buy")}
                type="button"
              >
                <ArrowUpRight className="size-4" />
                Buy {data.token.symbol}
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Sell</p>
                {sellLabel ? <Badge variant="outline">{sellLabel}</Badge> : null}
              </div>
              <Input
                animateNumeric
                inputMode="numeric"
                onChange={(event) => setSellPercent(event.target.value)}
                value={sellPercent}
              />
              <Button
                className="w-full"
                disabled={tradingDisabled || !data.actions.canSell}
                onClick={() => void submitTrade("sell")}
                type="button"
                variant="outline"
              >
                <ArrowDownRight className="size-4" />
                Sell {sellPercent}%
              </Button>
            </div>
          </div>

          {data.actions.lastSignature ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              Latest signature: {data.actions.lastSignature}
            </div>
          ) : null}

          {data.actions.lastError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {data.actions.lastError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-background/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No recent swaps available yet.
            </div>
          ) : (
            data.transactions.slice(0, 10).map((transaction, index) => (
              <div key={`${transaction.signature ?? index}-${transaction.timestamp}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          transaction.side === "buy"
                            ? "bg-emerald-500/85 text-black hover:bg-emerald-500/85"
                            : "bg-amber-500/85 text-black hover:bg-amber-500/85",
                        )}
                      >
                        {transaction.side}
                      </Badge>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {transaction.signature
                          ? `${transaction.signature.slice(0, 8)}...${transaction.signature.slice(-6)}`
                          : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTimestamp(transaction.timestamp)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {transaction.valueUsd != null ? (
                      <p className="font-medium text-foreground">
                        {formatCurrency(transaction.valueUsd)}
                      </p>
                    ) : null}
                    {transaction.solAmount != null ? (
                      <p className="text-xs text-muted-foreground">
                        {transaction.solAmount} SOL
                      </p>
                    ) : null}
                  </div>
                </div>
                {index < data.transactions.slice(0, 10).length - 1 ? <Separator /> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
