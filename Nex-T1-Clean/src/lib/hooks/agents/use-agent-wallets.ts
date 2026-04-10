"use client";

import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AgentWallet = {
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
  balanceUsd: number;
};

export type ProvisionWalletsPayload = {
  chains: string[];
  platform?: string;
};

export type ProvisionWalletsResult = {
  wallets: AgentWallet[];
};

export type ExportJwtResult = {
  jwt: string;
  expiresAt: string;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const AGENT_WALLETS_KEY = (agentId: string) =>
  ["agent-wallets", agentId] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function coerceNumber(value: UntypedJson, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceString(value: UntypedJson, fallback = ""): string {
  return typeof value === "string" ? value : String(value ?? fallback);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function deserializeWallet(raw: UntypedJson): AgentWallet {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;
  const status = coerceString(r.status, "active").toLowerCase();

  return {
    address: coerceString(r.address),
    platform: coerceString(r.platform),
    chainId: r.chainId ?? r.chain_id ?? 0,
    label: typeof r.label === "string" ? r.label : null,
    status: (["active", "provisioning", "revoked"] as const).includes(
      status as "active",
    )
      ? (status as AgentWallet["status"])
      : "active",
    generation: coerceNumber(r.generation, 1),
    balanceUsd: coerceNumber(r.balanceUsd ?? r.balance_usd),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchAgentWallets(
  agentId: string,
  signal?: AbortSignal,
): Promise<AgentWallet[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`/api/agents/${agentId}/portfolio`, {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch agent wallets");
  }

  const payload = (await response.json()) as Record<string, UntypedJson>;
  const data = (payload.data ?? payload) as Record<string, UntypedJson>;
  const wallets = Array.isArray(data.wallets) ? data.wallets : [];

  return wallets.map(deserializeWallet);
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

async function provisionWalletsRequest(
  agentId: string,
  payload: ProvisionWalletsPayload,
): Promise<ProvisionWalletsResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(`/api/agents/${agentId}/wallet/provision`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Failed to provision wallets");
    throw new Error(detail || "Failed to provision wallets");
  }

  const raw = (await response.json()) as Record<string, UntypedJson>;
  const data = (raw.data ?? raw) as Record<string, UntypedJson>;
  const wallets = Array.isArray(data.wallets)
    ? data.wallets.map(deserializeWallet)
    : [];

  return { wallets };
}

async function exportJwtRequest(agentId: string): Promise<ExportJwtResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(`/api/agents/${agentId}/wallet/export-jwt`, {
    method: "POST",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Failed to export JWT");
    throw new Error(detail || "Failed to export JWT");
  }

  const raw = (await response.json()) as Record<string, UntypedJson>;
  const data = (raw.data ?? raw) as Record<string, UntypedJson>;

  return {
    jwt: coerceString(data.token ?? data.jwt),
    expiresAt: coerceString(data.expiresAt ?? data.expires_at, new Date().toISOString()),
  };
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useAgentWallets(
  agentId: string,
): UseQueryResult<AgentWallet[], Error> & {
  provisionWallets: UseMutationResult<ProvisionWalletsResult, Error, ProvisionWalletsPayload>;
  exportJwt: UseMutationResult<ExportJwtResult, Error, void>;
} {
  const queryClient = useQueryClient();

  const query = useQuery<AgentWallet[], Error>({
    queryKey: AGENT_WALLETS_KEY(agentId),
    queryFn: ({ signal }) => fetchAgentWallets(agentId, signal),
    enabled: Boolean(agentId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidate = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: AGENT_WALLETS_KEY(agentId) })
      .catch(() => {});
    queryClient
      .invalidateQueries({ queryKey: ["agent-portfolio", agentId] })
      .catch(() => {});
  }, [queryClient, agentId]);

  const provisionWallets = useMutation<
    ProvisionWalletsResult,
    Error,
    ProvisionWalletsPayload
  >({
    mutationFn: (payload) => provisionWalletsRequest(agentId, payload),
    onSuccess: invalidate,
  });

  const exportJwt = useMutation<ExportJwtResult, Error, void>({
    mutationFn: () => exportJwtRequest(agentId),
  });

  return {
    ...query,
    provisionWallets,
    exportJwt,
  };
}
