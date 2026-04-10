"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentWalletSummary = {
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
  balanceUsd: number;
};

export type AgentTokenHolding = {
  tokenAddress: string;
  symbol: string;
  name: string;
  logo: string | null;
  decimals: number;
  balance: string;
  priceUsd: number;
  valueUsd: number;
  portfolioPercentage: number;
  chain: string;
};

export type AgentPortfolioSnapshot = {
  agentId: string;
  netWorthUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  tokens: AgentTokenHolding[];
  wallets: AgentWalletSummary[];
  updatedAt: string;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const AGENT_PORTFOLIO_KEY = (agentId: string) =>
  ["agent-portfolio", agentId] as const;

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchAgentPortfolio(
  agentId: string,
  signal?: AbortSignal,
): Promise<AgentPortfolioSnapshot> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/agents/${agentId}/portfolio`, {
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
    throw new Error(detail || "Failed to fetch agent portfolio");
  }

  const payload = (await response.json()) as Record<string, UntypedJson>;
  const data = payload.data ?? payload;

  return deserializePortfolio(data as Record<string, UntypedJson>);
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

function deserializeWallet(raw: UntypedJson): AgentWalletSummary {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;
  return {
    address: coerceString(r.address),
    platform: coerceString(r.platform),
    chainId: r.chainId ?? r.chain_id ?? 0,
    label: typeof r.label === "string" ? r.label : null,
    status: (["active", "provisioning", "revoked"] as const).includes(
      r.status as "active",
    )
      ? (r.status as AgentWalletSummary["status"])
      : "active",
    generation: coerceNumber(r.generation, 1),
    balanceUsd: coerceNumber(r.balanceUsd ?? r.balance_usd),
  };
}

function deserializeToken(raw: UntypedJson): AgentTokenHolding {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;
  return {
    tokenAddress: coerceString(r.tokenAddress ?? r.token_address),
    symbol: coerceString(r.symbol, "TOKEN"),
    name: coerceString(r.name, "Unknown"),
    logo: typeof r.logo === "string" ? r.logo : null,
    decimals: coerceNumber(r.decimals, 18),
    balance: coerceString(r.balance, "0"),
    priceUsd: coerceNumber(r.priceUsd ?? r.price_usd),
    valueUsd: coerceNumber(r.valueUsd ?? r.value_usd),
    portfolioPercentage: coerceNumber(
      r.portfolioPercentage ?? r.portfolio_percentage,
    ),
    chain: coerceString(r.chain),
  };
}

function deserializePortfolio(
  raw: Record<string, UntypedJson>,
): AgentPortfolioSnapshot {
  const wallets = Array.isArray(raw.wallets)
    ? raw.wallets.map(deserializeWallet)
    : [];
  const tokens = Array.isArray(raw.tokens)
    ? raw.tokens.map(deserializeToken)
    : [];

  return {
    agentId: coerceString(raw.agentId ?? raw.agent_id),
    netWorthUsd: coerceNumber(raw.netWorthUsd ?? raw.net_worth_usd),
    pnlUsd: coerceNumber(raw.pnlUsd ?? raw.pnl_usd),
    pnlPercent: coerceNumber(raw.pnlPercent ?? raw.pnl_percent),
    tokens,
    wallets,
    updatedAt: coerceString(
      raw.updatedAt ?? raw.updated_at,
      new Date().toISOString(),
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgentPortfolio(
  agentId: string,
): UseQueryResult<AgentPortfolioSnapshot, Error> {
  return useQuery<AgentPortfolioSnapshot, Error>({
    queryKey: AGENT_PORTFOLIO_KEY(agentId),
    queryFn: ({ signal }) => fetchAgentPortfolio(agentId, signal),
    enabled: Boolean(agentId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}
