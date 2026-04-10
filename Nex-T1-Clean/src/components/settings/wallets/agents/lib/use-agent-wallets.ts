"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

import type { AgentWalletRow, AgentSummary } from "./agent-wallet-types";
import { coerceNumber, coerceString } from "./agent-wallet-types";

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

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

function deserializeWallet(raw: UntypedJson): AgentWalletRow {
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
      ? (status as AgentWalletRow["status"])
      : "active",
    generation: coerceNumber(r.generation, 1),
    balanceUsd: coerceNumber(r.balanceUsd ?? r.balance_usd),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher: all agents with their wallets (batch endpoint)            */
/* ------------------------------------------------------------------ */

async function fetchAgentsWithWallets(
  signal?: AbortSignal,
): Promise<AgentSummary[]> {
  const headers = await getAuthHeaders();

  const res = await fetch("/api/agents/wallets/summary", {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (res.status === 401) return [];
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || "Failed to fetch agent wallet summaries");
  }

  const payload = (await res.json()) as Record<string, UntypedJson>;
  const rows = Array.isArray((payload.data as Record<string, UntypedJson>)?.agents)
    ? ((payload.data as Record<string, UntypedJson>).agents as UntypedJson[])
    : [];

  const agentMap = new Map<
    string,
    { summary: Record<string, UntypedJson>; wallets: AgentWalletRow[] }
  >();

  for (const raw of rows) {
    const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, UntypedJson>;
    const agentId = coerceString(row.agent_id);
    if (!agentId) continue;

    const wallet = deserializeWallet(row);

    const existing = agentMap.get(agentId);
    if (existing) {
      existing.wallets.push(wallet);
    } else {
      agentMap.set(agentId, { summary: row, wallets: [wallet] });
    }
  }

  return Array.from(agentMap.entries()).map(([id, { summary, wallets }]) => {
    const currentGeneration = wallets.reduce(
      (max, w) => Math.max(max, w.generation),
      1,
    );
    const totalNetWorthUsd = wallets
      .filter((w) => w.status === "active")
      .reduce((sum, w) => sum + w.balanceUsd, 0);

    return {
      id,
      name: coerceString(summary.agent_name ?? summary.name, "Unnamed Agent"),
      slug: coerceString(summary.agent_slug ?? summary.slug),
      avatarUrl: typeof summary.avatar_url === "string" ? summary.avatar_url : null,
      ownerUserId: typeof summary.owner_user_id === "string" ? summary.owner_user_id : null,
      wallets,
      currentGeneration,
      totalNetWorthUsd,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

async function provisionWalletsForAgent(agentId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`/api/agents/${agentId}/wallet/provision`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Provisioning failed");
    throw new Error(detail || "Provisioning failed");
  }
}

async function exportJwtForAgent(
  agentId: string,
): Promise<{ jwt: string; expiresAt: string }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`/api/agents/${agentId}/wallet/export-jwt`, {
    method: "POST",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "JWT export failed");
    throw new Error(detail || "JWT export failed");
  }

  const raw = (await response.json()) as Record<string, UntypedJson>;
  const data = (raw.data ?? raw) as Record<string, UntypedJson>;

  return {
    jwt: coerceString(data.token ?? data.jwt),
    expiresAt: coerceString(
      data.expiresAt ?? data.expires_at,
      new Date().toISOString(),
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Custom Hook                                                        */
/* ------------------------------------------------------------------ */

export function useAgentWallets() {
  const queryClient = useQueryClient();
  const [provisioningAgentId, setProvisioningAgentId] = useState<string | null>(null);
  const [exportingJwtAgentId, setExportingJwtAgentId] = useState<string | null>(null);
  const [exportedJwt, setExportedJwt] = useState<{
    jwt: string;
    expiresAt: string;
  } | null>(null);

  const {
    data: agents,
    isLoading,
    error,
  } = useQuery<AgentSummary[], Error>({
    queryKey: ["agent-wallets-section"],
    queryFn: ({ signal }) => fetchAgentsWithWallets(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const provisionMutation = useMutation<void, Error, string>({
    mutationFn: provisionWalletsForAgent,
    onMutate: (agentId) => setProvisioningAgentId(agentId),
    onSettled: () => {
      setProvisioningAgentId(null);
      queryClient.invalidateQueries({ queryKey: ["agent-wallets-section"] });
    },
  });

  const exportJwtMutation = useMutation<
    { jwt: string; expiresAt: string },
    Error,
    string
  >({
    mutationFn: exportJwtForAgent,
    onMutate: (agentId) => setExportingJwtAgentId(agentId),
    onSuccess: (result) => setExportedJwt(result),
    onSettled: () => setExportingJwtAgentId(null),
  });

  const handleProvision = useCallback(
    (agentId: string) => provisionMutation.mutate(agentId),
    [provisionMutation],
  );

  const handleExportJwt = useCallback(
    (agentId: string) => exportJwtMutation.mutate(agentId),
    [exportJwtMutation],
  );

  return {
    agents,
    isLoading,
    error,
    provisionMutation,
    exportJwtMutation,
    provisioningAgentId,
    exportingJwtAgentId,
    exportedJwt,
    setExportedJwt,
    handleProvision,
    handleExportJwt,
  };
}
