"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentPosition = {
  id: string;
  token: string;
  tokenAddress: string;
  chain: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPercent: number;
  openedAt: string;
  venue: string | null;
};

export type AgentPositionsResponse = {
  positions: AgentPosition[];
  totalUnrealizedPnlUsd: number;
};

/* ------------------------------------------------------------------ */
/*  Query key                                                          */
/* ------------------------------------------------------------------ */

const AGENT_POSITIONS_KEY = (agentId: string) =>
  ["agent-positions", agentId] as const;

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchAgentPositions(
  agentId: string,
  signal?: AbortSignal,
): Promise<AgentPositionsResponse> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/agents/${agentId}/positions`, {
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
    throw new Error(detail || "Failed to fetch agent positions");
  }

  const payload = (await response.json()) as Record<string, UntypedJson>;
  const data = (payload.data ?? payload) as Record<string, UntypedJson>;

  return deserializePositionsResponse(data);
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

function deserializePosition(raw: UntypedJson): AgentPosition {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;
  const side = coerceString(r.side, "long").toLowerCase();

  return {
    id: coerceString(r.id),
    token: coerceString(r.token ?? r.symbol),
    tokenAddress: coerceString(r.tokenAddress ?? r.token_address),
    chain: coerceString(r.chain),
    side: side === "short" ? "short" : "long",
    entryPrice: coerceNumber(r.entryPrice ?? r.entry_price),
    currentPrice: coerceNumber(r.currentPrice ?? r.current_price),
    quantity: coerceNumber(r.quantity ?? r.qty),
    unrealizedPnlUsd: coerceNumber(
      r.unrealizedPnlUsd ?? r.unrealized_pnl_usd,
    ),
    unrealizedPnlPercent: coerceNumber(
      r.unrealizedPnlPercent ?? r.unrealized_pnl_percent,
    ),
    openedAt: coerceString(
      r.openedAt ?? r.opened_at,
      new Date().toISOString(),
    ),
    venue: typeof r.venue === "string" ? r.venue : null,
  };
}

function deserializePositionsResponse(
  raw: Record<string, UntypedJson>,
): AgentPositionsResponse {
  const positions = Array.isArray(raw.positions)
    ? raw.positions.map(deserializePosition)
    : [];

  const totalUnrealizedPnlUsd = coerceNumber(
    raw.totalUnrealizedPnlUsd ?? raw.total_unrealized_pnl_usd,
  );

  return { positions, totalUnrealizedPnlUsd };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAgentPositions(
  agentId: string,
): UseQueryResult<AgentPositionsResponse, Error> {
  return useQuery<AgentPositionsResponse, Error>({
    queryKey: AGENT_POSITIONS_KEY(agentId),
    queryFn: ({ signal }) => fetchAgentPositions(agentId, signal),
    enabled: Boolean(agentId),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}
