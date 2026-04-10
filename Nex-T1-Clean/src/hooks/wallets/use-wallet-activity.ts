"use client";

import { useState, useEffect, useCallback } from "react";
import { getChainAdapter } from "@/lib/chain-adapter/chain-adapter";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import type { UnifiedTransaction as MoralisUnifiedTransaction } from "@/types/wallet-unified";

type AssetType = "evm" | "solana";
type WalletActivitySource = "moralis" | "cdp";

type EvmHistoryLike = {
    hash?: string;
    transaction_hash?: string;
    from_address?: string;
    to_address?: string;
    value?: string;
    block_timestamp?: string;
    receipt_status?: string;
};

type SolanaTxLike = {
    txHash?: string;
    hash?: string;
    from?: string;
    to?: string;
    blockTime?: string | number;
    blockUnixTime?: number;
    status?: boolean;
    balanceChange?: Array<{ amount: number; symbol?: string }>;
};

type SolanaActivityItem = SolanaTxLike | MoralisUnifiedTransaction;

type WalletTransactionsResponse = {
    transactions?: UntypedJson[];
    error?: string;
};

type CdpTransactionLike = {
    txHash?: string;
    direction?: string;
    category?: string;
    from?: string;
    to?: string;
    timestamp?: string | null;
    chain?: string | null;
};

export interface UnifiedTransaction {
    hash: string;
    timestamp: number;
    from: string;
    to: string;
    value: string;
    symbol?: string;
    direction: "in" | "out" | "self";
    status: "success" | "pending" | "failed";
    explorerUrl?: string;
}

interface UseWalletActivityResult {
    transactions: UnifiedTransaction[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

interface UseWalletActivityOptions {
    source?: WalletActivitySource;
    limit?: number;
}

function resolveChainKey(chainId: string) {
    if (chainId.startsWith("0x")) {
        const parsed = Number.parseInt(chainId, 16);
        return Number.isNaN(parsed) ? chainId : String(parsed);
    }
    return chainId;
}

function isMoralisUnifiedTransaction(tx: SolanaActivityItem): tx is MoralisUnifiedTransaction {
    return "id" in tx && "category" in tx;
}

/** Safely parse any timestamp value to epoch milliseconds, falling back to Date.now(). */
function safeTimestampMs(value: string | number | null | undefined): number {
    if (value == null) return Date.now();

    if (typeof value === "number") {
        if (!Number.isFinite(value) || value <= 0) return Date.now();
        // Heuristic: if less than ~year-2001 in ms, assume seconds
        return value > 10_000_000_000 ? value : value * 1000;
    }

    // String value
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric > 10_000_000_000 ? numeric : numeric * 1000;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
}

function toTimestampFromUnified(tx: MoralisUnifiedTransaction): number {
    return safeTimestampMs(tx.timestamp);
}

async function fetchWalletTransactions(params: {
    address: string;
    chainFamily: AssetType;
    chainId?: string;
    limit?: number;
}): Promise<WalletTransactionsResponse> {
    const searchParams = new URLSearchParams({
        address: params.address,
        chainFamily: params.chainFamily,
    });

    if (params.chainId) {
        searchParams.set("chainId", params.chainId);
    }

    searchParams.set("limit", String(params.limit ?? 25));

    const response = await fetch(`/api/wallets/transactions?${searchParams.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as WalletTransactionsResponse;

    if (!response.ok) {
        throw new Error(payload.error ?? "Failed to fetch transaction history");
    }

    return payload;
}

async function fetchCdpWalletTransactions(params: {
    address: string;
    chainId?: string;
    limit?: number;
    offset?: number;
}): Promise<{ transactions: CdpTransactionLike[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(params.limit ?? 25));
    searchParams.set("offset", String(params.offset ?? 0));
    if (params.chainId) {
        searchParams.set("chainId", params.chainId);
    }

    const response = await fetch(
        `/api/cdp/wallets/${encodeURIComponent(params.address)}/transactions?${searchParams.toString()}`,
        {
            method: "GET",
            credentials: "include",
            cache: "no-store",
        },
    );

    const payload = (await response.json().catch(() => ({}))) as unknown;
    if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to fetch Nex Wallet transactions"));
    }

    const transactions = unwrapApiPayload<CdpTransactionLike[]>(payload) ?? [];
    const meta =
        payload && typeof payload === "object" && payload !== null && "meta" in payload
            ? ((payload as { meta?: { hasMore?: unknown } }).meta ?? {})
            : {};

    return {
        transactions,
        hasMore: Boolean((meta as { hasMore?: unknown }).hasMore),
    };
}

export function useWalletActivity(
    address: string | undefined,
    type: AssetType,
    chainId: string = "0x1",
    options: UseWalletActivityOptions = {},
): UseWalletActivityResult {
    const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const source = options.source ?? "moralis";
    const limit = options.limit ?? 25;

    const fetchActivity = useCallback(async () => {
        if (!address) return;

        setIsLoading(true);
        setError(null);

        try {
            const chainKey = resolveChainKey(chainId);
            const explorerAdapter =
                type === "solana"
                    ? getChainAdapter("solana")
                    : getChainAdapter(chainKey) ?? getChainAdapter("ethereum");

            if (type === "evm") {
                if (source === "cdp") {
                    const normalizedChainId = chainId.startsWith("0x")
                        ? (() => {
                            const parsed = Number.parseInt(chainId, 16);
                            return Number.isFinite(parsed) ? String(parsed) : "8453";
                        })()
                        : chainId;
                    const { transactions: cdpTxs } = await fetchCdpWalletTransactions({
                        address,
                        chainId: normalizedChainId,
                        limit,
                        offset: 0,
                    });

                    const unified: UnifiedTransaction[] = cdpTxs.map((tx: CdpTransactionLike) => {
                        const hash = tx.txHash ?? "";
                        const directionRaw = typeof tx.direction === "string" ? tx.direction.toLowerCase() : "self";
                        const direction =
                            directionRaw === "in" || directionRaw === "out" || directionRaw === "self"
                                ? directionRaw
                                : "self";

                        return {
                            hash,
                            timestamp: safeTimestampMs(tx.timestamp),
                            from: tx.from ?? "",
                            to: tx.to ?? "",
                            value: "0",
                            symbol: typeof tx.category === "string" ? tx.category : undefined,
                            direction,
                            status: "success",
                            explorerUrl: hash ? explorerAdapter?.getExplorerTxUrl(hash) : undefined,
                        };
                    });

                    unified.sort((a, b) => b.timestamp - a.timestamp);
                    setTransactions(unified);
                } else {
                    const chainHex = chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
                    const { transactions: txs, error: err } = await fetchWalletTransactions({
                        address,
                        chainFamily: "evm",
                        chainId: chainHex,
                        limit,
                    });
                    
                    if (err) throw new Error(err);

                    const unified: UnifiedTransaction[] = (txs || []).map((tx: EvmHistoryLike) => {
                        const lowerAddress = address.toLowerCase();
                        const from = tx.from_address?.toLowerCase() ?? "";
                        const to = tx.to_address?.toLowerCase() ?? "";
                        const direction =
                            from === lowerAddress && to === lowerAddress
                                ? "self"
                                : from === lowerAddress
                                ? "out"
                                : to === lowerAddress
                                ? "in"
                                : "self";
                        const hash = tx.hash ?? tx.transaction_hash ?? "";
                        return {
                            hash,
                            timestamp: safeTimestampMs(tx.block_timestamp),
                            from: tx.from_address ?? "",
                            to: tx.to_address ?? "",
                            value: tx.value ?? "0",
                            direction,
                            status: tx.receipt_status === "0" ? "failed" : tx.receipt_status === "1" ? "success" : "pending",
                            explorerUrl: hash ? explorerAdapter?.getExplorerTxUrl(hash) : undefined
                        };
                    });
                    unified.sort((a, b) => b.timestamp - a.timestamp);
                    setTransactions(unified);
                }
            } else {
                const { transactions: txs, error: err } = await fetchWalletTransactions({
                    address,
                    chainFamily: "solana",
                    limit,
                });
                if (err) throw new Error(err);

                const unified: UnifiedTransaction[] = ((txs || []) as SolanaActivityItem[]).map((tx) => {
                    if (isMoralisUnifiedTransaction(tx)) {
                        const hash = tx.hash || tx.id;
                        return {
                            hash,
                            timestamp: toTimestampFromUnified(tx),
                            from: tx.from ?? "",
                            to: tx.to ?? "",
                            value: tx.valueUsd != null ? String(tx.valueUsd) : "0",
                            direction: tx.direction === "unknown" ? "self" : tx.direction,
                            status: "success",
                            explorerUrl: hash ? explorerAdapter?.getExplorerTxUrl(hash) : undefined,
                        };
                    }

                    const balanceChanges = Array.isArray(tx.balanceChange) ? tx.balanceChange : [];
                    const netChange = balanceChanges.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
                    const primaryChange = balanceChanges[0] ?? null;
                    const isFrom = tx.from === address;
                    const isTo = tx.to === address;
                    const direction =
                        isFrom && isTo ? "self" : isFrom ? "out" : isTo ? "in" : "self";

                    const hash = tx.txHash ?? tx.hash ?? "";
                    const ts = safeTimestampMs(tx.blockUnixTime ?? tx.blockTime);

                    return {
                        hash,
                        timestamp: ts,
                        from: tx.from ?? "",
                        to: tx.to ?? "",
                        value: netChange.toString(),
                        symbol: typeof primaryChange?.symbol === "string" ? primaryChange.symbol : undefined,
                        direction,
                        status: tx.status ? "success" : "failed",
                        explorerUrl: hash ? explorerAdapter?.getExplorerTxUrl(hash) : undefined
                    };
                });
                unified.sort((a, b) => b.timestamp - a.timestamp);
                setTransactions(unified);
            }
        } catch (e: UntypedJson) {
            setError(e instanceof Error ? e.message : "Failed to load activity");
        } finally {
            setIsLoading(false);
        }
    }, [address, type, chainId, source, limit]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    return { transactions, isLoading, error, refetch: fetchActivity };
}
