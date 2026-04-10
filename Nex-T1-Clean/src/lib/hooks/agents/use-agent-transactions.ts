"use client";

import { useMemo } from "react";
import {
  useQuery,
  keepPreviousData,
  type UseQueryResult,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentTransactionCategory =
  | "swap"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "approval"
  | "other";

export type AgentTransaction = {
  id: string;
  txHash: string | null;
  chainId: number | string;
  category: AgentTransactionCategory;
  from: string;
  to: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  amount: string;
  amountUsd: number | null;
  status: "confirmed" | "pending" | "failed";
  executedAt: string;
  gasUsedUsd: number | null;
};

export type AgentTransactionsEnvelope = {
  transactions: AgentTransaction[];
  total: number;
  hasMore: boolean;
};

export type UseAgentTransactionsOptions = {
  limit?: number;
  offset?: number;
  category?: AgentTransactionCategory;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const AGENT_TRANSACTIONS_KEY = (
  agentId: string,
  options: UseAgentTransactionsOptions,
) =>
  [
    "agent-transactions",
    agentId,
    options.limit ?? 20,
    options.offset ?? 0,
    options.category ?? "all",
  ] as const;

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchAgentTransactions(
  agentId: string,
  options: UseAgentTransactionsOptions,
  signal?: AbortSignal,
): Promise<AgentTransactionsEnvelope> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;

  const params = new URLSearchParams();
  if (typeof options.limit === "number" && options.limit > 0) {
    params.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number" && options.offset > 0) {
    params.set("offset", String(options.offset));
  }
  if (options.category && options.category !== ("all" as string)) {
    params.set("category", options.category);
  }

  const query = params.toString();
  const url = `/api/agents/${agentId}/transactions${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch agent transactions");
  }

  const payload = (await response.json()) as Record<string, UntypedJson>;
  const data = (payload.data ?? payload) as Record<string, UntypedJson>;

  return deserializeTransactionsEnvelope(data);
}

/* ------------------------------------------------------------------ */
/*  Deserializer                                                       */
/* ------------------------------------------------------------------ */

function coerceNumber(value: UntypedJson, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceString(value: UntypedJson, fallback = ""): string {
  return typeof value === "string" ? value : String(value ?? fallback);
}

const VALID_CATEGORIES = new Set<AgentTransactionCategory>([
  "swap",
  "transfer",
  "deposit",
  "withdrawal",
  "approval",
  "other",
]);

const VALID_STATUSES = new Set(["confirmed", "pending", "failed"]);

function deserializeTransaction(raw: UntypedJson): AgentTransaction {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;

  const category = coerceString(r.category, "other").toLowerCase();
  const status = coerceString(r.status, "confirmed").toLowerCase();

  return {
    id: coerceString(r.id),
    txHash: typeof r.txHash === "string" || typeof r.tx_hash === "string"
      ? coerceString(r.txHash ?? r.tx_hash)
      : null,
    chainId: r.chainId ?? r.chain_id ?? 0,
    category: VALID_CATEGORIES.has(category as AgentTransactionCategory)
      ? (category as AgentTransactionCategory)
      : "other",
    from: coerceString(r.from),
    to: coerceString(r.to),
    tokenSymbol: coerceString(r.tokenSymbol ?? r.token_symbol, "ETH"),
    tokenAddress: typeof (r.tokenAddress ?? r.token_address) === "string"
      ? coerceString(r.tokenAddress ?? r.token_address)
      : null,
    amount: coerceString(r.amount, "0"),
    amountUsd:
      r.amountUsd != null || r.amount_usd != null
        ? coerceNumber(r.amountUsd ?? r.amount_usd)
        : null,
    status: VALID_STATUSES.has(status)
      ? (status as AgentTransaction["status"])
      : "confirmed",
    executedAt: coerceString(
      r.executedAt ?? r.executed_at,
      new Date().toISOString(),
    ),
    gasUsedUsd:
      r.gasUsedUsd != null || r.gas_used_usd != null
        ? coerceNumber(r.gasUsedUsd ?? r.gas_used_usd)
        : null,
  };
}

function deserializeTransactionsEnvelope(
  raw: Record<string, UntypedJson>,
): AgentTransactionsEnvelope {
  const transactions = Array.isArray(raw.transactions)
    ? raw.transactions.map(deserializeTransaction)
    : [];

  return {
    transactions,
    total:
      typeof raw.total === "number"
        ? raw.total
        : transactions.length,
    hasMore: Boolean(raw.hasMore ?? raw.has_more),
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgentTransactions(
  agentId: string,
  options: UseAgentTransactionsOptions = {},
): UseQueryResult<AgentTransactionsEnvelope, Error> {
  const stableOptions = useMemo(
    () => ({
      limit: options.limit,
      offset: options.offset,
      category: options.category,
    }),
    [options.limit, options.offset, options.category],
  );

  return useQuery<AgentTransactionsEnvelope, Error>({
    queryKey: AGENT_TRANSACTIONS_KEY(agentId, stableOptions),
    queryFn: ({ signal }) =>
      fetchAgentTransactions(agentId, stableOptions, signal),
    enabled: Boolean(agentId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
