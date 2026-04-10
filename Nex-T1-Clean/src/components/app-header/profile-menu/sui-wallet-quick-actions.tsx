"use client";

import { useMemo } from "react";
import { ExternalLink, RotateCw, SendHorizonal } from "lucide-react";
import { useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import type { CoinMetadata } from "@mysten/sui/client";

import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import { cn, truncateAddress } from "@/lib/utils";
import { getSuiExplorerAccountUrl, getSuiExplorerTransactionUrl, type SuiNetworkName } from "@/modules/wallets/sui/config";

const MIST_PER_SUI = 1_000_000_000n;

type SuiWalletQuickActionsProps = {
  address: string;
  explorerUrl?: string | null;
  network?: SuiNetworkName;
  onSendSui?: (() => void) | null;
};

type SuiBalanceEntry = {
  coinType: string;
  totalBalance: string;
};

type TransactionAccumulator = {
  digest: string;
  timestamp: number | null;
  status: string;
  direction: "sent" | "received" | "both";
  sentTx?: UntypedJson;
  receivedTx?: UntypedJson;
};

type TransactionSummary = {
  digest: string;
  timestamp: number | null;
  status: string;
  direction: "sent" | "received" | "both";
  amountDisplay: string | null;
  counterparty: string | null;
};

function getCoinDisplaySymbol(coinType: string) {
  if (!coinType) return "COIN";
  const segments = coinType.split("::");
  return segments[segments.length - 1] ?? coinType;
}

function formatCoinBalance(entry: SuiBalanceEntry, metadataByCoinType: Map<string, CoinMetadata | null>) {
  const { coinType, totalBalance } = entry;
  if (!totalBalance) return "0";
  const isSui = coinType.endsWith("::sui::SUI");
  if (isSui) {
    try {
      const raw = BigInt(totalBalance);
      if (raw > BigInt(Number.MAX_SAFE_INTEGER)) {
        const whole = raw / MIST_PER_SUI;
        return `${whole.toString()} SUI`;
      }
      const parsed = Number(raw) / Number(MIST_PER_SUI);
      return `${formatNativeBalance(parsed, 4)} SUI`;
    } catch {
      return `${totalBalance} SUI`;
    }
  }
  const metadata = metadataByCoinType.get(coinType) ?? null;
  const symbol = metadata?.symbol ?? getCoinDisplaySymbol(coinType);
  try {
    const raw = BigInt(totalBalance);
    const decimals = typeof metadata?.decimals === "number" ? Math.max(metadata.decimals, 0) : 0;
    if (decimals === 0) {
      if (raw <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return `${Number(raw).toLocaleString()} ${symbol}`;
      }
      return `${raw.toString()} ${symbol}`;
    }
    if (raw <= BigInt(Number.MAX_SAFE_INTEGER)) {
      const numeric = Number(raw) / 10 ** decimals;
      return `${formatNativeBalance(numeric, 4)} ${symbol}`;
    }
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = raw / divisor;
    const fractional = raw % divisor;
    const fractionalDisplay = fractional
      ? fractional
          .toString()
          .padStart(decimals, "0")
          .slice(0, 4)
          .replace(/0+$/, "")
      : "";
    return fractionalDisplay ? `${whole.toString()}.${fractionalDisplay} ${symbol}` : `${whole.toString()} ${symbol}`;
  } catch {
    // ignore parsing errors
  }
  return `${totalBalance} ${symbol}`;
}

function extractSuiBalanceChange(transaction: UntypedJson, ownerAddress: string): bigint | null {
  const changes = ((transaction as { effects?: { balanceChanges?: UntypedJson[] } })?.effects?.balanceChanges ?? []) as Array<{
    owner?: { AddressOwner?: string };
    coinType?: string;
    amount?: string;
  }>;
  for (const change of changes) {
    if (!change?.coinType?.endsWith("::sui::SUI")) continue;
    if (change.owner?.AddressOwner !== ownerAddress) continue;
    if (typeof change.amount !== "string") continue;
    try {
      return BigInt(change.amount);
    } catch {
      return null;
    }
  }
  return null;
}

function extractCounterparty(transaction: UntypedJson, ownerAddress: string, direction: TransactionSummary["direction"]): string | null {
  const events = ((transaction as { effects?: { events?: UntypedJson[] } })?.effects?.events ?? []) as Array<{
    type?: string;
    sender?: string;
    recipient?: { AddressOwner?: string; ObjectOwner?: string };
  }>;
  for (const event of events) {
    if (event?.type !== "transferObject") continue;
    const sender = event.sender;
    const recipient = event.recipient?.AddressOwner ?? event.recipient?.ObjectOwner ?? null;
    if (direction !== "received" && sender === ownerAddress && recipient) {
      return recipient;
    }
    if (direction !== "sent" && recipient === ownerAddress && sender) {
      return sender;
    }
  }
  return null;
}

function formatSuiDelta(amount: bigint | null): string | null {
  if (amount == null) {
    return null;
  }
  const isPositive = amount >= 0n;
  const absolute = isPositive ? amount : -amount;
  let numericDisplay: string;
  if (absolute > BigInt(Number.MAX_SAFE_INTEGER)) {
    const whole = absolute / MIST_PER_SUI;
    numericDisplay = `${whole.toString()} SUI`;
  } else {
    const parsed = Number(absolute) / Number(MIST_PER_SUI);
    numericDisplay = `${formatNativeBalance(parsed, 4)} SUI`;
  }
  return `${isPositive ? "+" : "-"}${numericDisplay}`;
}

export function SuiWalletQuickActions({ address, explorerUrl, network, onSendSui }: SuiWalletQuickActionsProps) {
  const resolvedExplorerUrl = explorerUrl ?? (network ? getSuiExplorerAccountUrl(address, network) : null);
  const { data, isPending, isRefetching, refetch } = useSuiClientQuery(
    "getAllBalances",
    { owner: address },
    {
      enabled: Boolean(address),
      staleTime: 30_000,
    },
  );

  const metadataTargets = useMemo(() => {
    const balances = Array.isArray(data) ? (data as SuiBalanceEntry[]) : [];
    return balances
      .filter((entry) => !entry.coinType.endsWith("::sui::SUI"))
      .slice(0, 3)
      .map((entry) => entry.coinType);
  }, [data]);

  const metadataResults = useSuiClientQueries({
    queries: metadataTargets.map((coinType) => ({
      method: "getCoinMetadata" as const,
      params: { coinType },
      options: { enabled: Boolean(address && coinType), staleTime: 5 * 60 * 1000 },
    })),
  });

  const highlightedBalances = useMemo(() => {
    const balances = Array.isArray(data) ? (data as SuiBalanceEntry[]) : [];
    return balances.slice(0, 3);
  }, [data]);

  const metadataByCoinType = useMemo(() => {
    const map = new Map<string, CoinMetadata | null>();
    metadataTargets.forEach((coinType, index) => {
      const entry = metadataResults[index]?.data as CoinMetadata | null | undefined;
      if (coinType && entry) {
        map.set(coinType, entry);
      }
    });
    return map;
  }, [metadataResults, metadataTargets]);

  const baseTransactionQuery = {
    limit: 5,
    order: "descending" as const,
    options: { showEffects: true, showInput: false },
  };

  const fromTransactions = useSuiClientQuery(
    "queryTransactionBlocks",
    {
      ...baseTransactionQuery,
      filter: { FromAddress: address },
    },
    {
      enabled: Boolean(address),
      staleTime: 60_000,
    },
  );

  const toTransactions = useSuiClientQuery(
    "queryTransactionBlocks",
    {
      ...baseTransactionQuery,
      filter: { ToAddress: address },
    },
    {
      enabled: Boolean(address),
      staleTime: 60_000,
    },
  );

  const transactionsPending = fromTransactions.isPending || toTransactions.isPending;

  const recentTransactions = useMemo<TransactionSummary[]>(() => {
    const map = new Map<string, TransactionAccumulator>();

    const ingest = (items: UntypedJson, direction: "sent" | "received") => {
      if (!Array.isArray(items)) return;
      items.forEach((tx) => {
        const digest = (tx as { digest?: string })?.digest;
        if (!digest) {
          return;
        }
        const timestampRaw = (tx as { timestampMs?: string | number | null })?.timestampMs;
        const timestamp = typeof timestampRaw === "string" || typeof timestampRaw === "number" ? Number(timestampRaw) : null;
        const statusValue = ((tx as { effects?: { status?: { status?: string } } })?.effects?.status?.status ?? "unknown").toString();
        const existing = map.get(digest);
        if (existing) {
          existing.direction = existing.direction === direction ? direction : "both";
          if (timestamp && (!existing.timestamp || timestamp > existing.timestamp)) {
            existing.timestamp = timestamp;
          }
          existing.status = statusValue;
          if (direction === "sent") {
            existing.sentTx = tx;
          } else {
            existing.receivedTx = tx;
          }
          return;
        }
        map.set(digest, {
          digest,
          timestamp,
          status: statusValue,
          direction,
          sentTx: direction === "sent" ? tx : undefined,
          receivedTx: direction === "received" ? tx : undefined,
        });
      });
    };

    ingest(fromTransactions.data?.data, "sent");
    ingest(toTransactions.data?.data, "received");

    return Array.from(map.values())
      .map((entry) => {
        const referenceTx = entry.sentTx ?? entry.receivedTx;
        const amountDisplay = formatSuiDelta(extractSuiBalanceChange(referenceTx, address));
        const counterparty = extractCounterparty(referenceTx, address, entry.direction);
        return {
          digest: entry.digest,
          timestamp: entry.timestamp,
          status: entry.status,
          direction: entry.direction,
          amountDisplay,
          counterparty,
        } satisfies TransactionSummary;
      })
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, 3);
  }, [address, fromTransactions.data?.data, toTransactions.data?.data]);

  if (!address) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-regular uppercase tracking-wide text-muted-foreground">Sui assets</span>
          <span className="text-xs text-muted-foreground">Top balances from your connected Sui wallet</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onSendSui) {
                onSendSui();
              }
            }}
            disabled={!onSendSui}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-primary/60 px-2 py-1 text-xs font-regular text-primary transition",
              onSendSui ? "hover:border-primary hover:text-primary" : "cursor-not-allowed opacity-50",
            )}
          >
            <SendHorizonal className="size-3" />
            Send SUI
          </button>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={isPending || isRefetching}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-xs font-medium text-foreground transition",
              "hover:border-foreground/40 hover:text-foreground",
              (isPending || isRefetching) && "cursor-not-allowed opacity-60",
            )}
          >
            <RotateCw className={cn("size-3", isRefetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {isPending ? (
          <p className="text-xs text-muted-foreground">Loading Sui balances…</p>
        ) : highlightedBalances.length ? (
          highlightedBalances.map((entry) => (
            <div key={`${entry.coinType}`} className="flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground">{getCoinDisplaySymbol(entry.coinType)}</span>
              <span className="text-xs font-regular text-foreground">{formatCoinBalance(entry, metadataByCoinType)}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No Sui coins detected yet.</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.65rem] font-regular uppercase tracking-wide text-muted-foreground">Recent activity</span>
          {resolvedExplorerUrl ? (
            <a
              href={`${resolvedExplorerUrl}?tab=txblocks`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] font-regular uppercase tracking-wide text-primary hover:underline"
            >
              View all
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        {transactionsPending ? (
          <p className="text-xs text-muted-foreground">Loading transactions…</p>
        ) : recentTransactions.length ? (
          <ul className="space-y-1.5">
            {recentTransactions.map((tx) => {
              const digest = tx.digest;
              const timestampDisplay = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Timestamp unavailable";
              const href = digest && network ? getSuiExplorerTransactionUrl(digest, network) : undefined;
              const directionLabel =
                tx.direction === "both" ? "Sent & received" : tx.direction === "received" ? "Received" : "Sent";
              const counterpartyLabel = tx.counterparty
                ? `${tx.direction === "received" ? "From" : tx.direction === "sent" ? "To" : "Counterparty"} ${truncateAddress(tx.counterparty)}`
                : null;
              const amountClass = tx.amountDisplay?.startsWith("-") ? "text-amber-500" : "text-[#8eb94f]";
              const content = (
                <div className="flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1 text-xs">
                  <div className="flex flex-col">
                    <span className="font-mono text-[0.65rem]">{digest ? `${digest.slice(0, 6)}…${digest.slice(-4)}` : "Unknown digest"}</span>
                    <span className="text-[0.65rem] text-muted-foreground">{timestampDisplay}</span>
                    <span className="text-[0.65rem] text-muted-foreground">{directionLabel}</span>
                    {counterpartyLabel ? (
                      <span className="text-[0.65rem] text-muted-foreground">{counterpartyLabel}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {tx.amountDisplay ? (
                      <span className={cn("font-mono text-[0.65rem]", amountClass)}>{tx.amountDisplay}</span>
                    ) : null}
                    <span
                      className={cn(
                        "text-[0.65rem] font-regular",
                        tx.status.toLowerCase() === "success" ? "text-[#8eb94f]" : "text-amber-500",
                      )}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
              return (
                <li key={digest ?? timestampDisplay}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="block hover:opacity-90">
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No recent transactions.</p>
        )}
      </div>
      {resolvedExplorerUrl ? (
        <a
          href={resolvedExplorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-regular text-primary hover:underline"
        >
          View account on Sui Explorer
          <ExternalLink className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
