"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types (mirrored from server types for client consumption)
// ---------------------------------------------------------------------------

export type PolicyCriteria =
  | { type: "evmAddress"; addresses: string[]; operator: "in" | "not_in" }
  | { type: "ethValue"; gte?: string; lte?: string }
  | { type: "evmNetwork"; networks: string[] }
  | { type: "netUSDChange"; gte?: number; lte?: number };

export type PolicyRule = {
  action: "accept" | "reject";
  criteria: PolicyCriteria[];
};

export type CdpPolicy = {
  id: string;
  name: string;
  description?: string;
  scope: "project" | "account";
  accountAddress?: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePolicyParams = {
  name: string;
  description?: string;
  scope: "project" | "account";
  accountAddress?: string;
  rules: PolicyRule[];
};

export type UpdatePolicyParams = Partial<CreatePolicyParams>;

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { message: string; details?: unknown };
};

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

const cdpPolicyKeys = {
  all: ["cdp-policies"] as const,
  list: (accountAddress?: string) =>
    accountAddress
      ? (["cdp-policies", "list", accountAddress] as const)
      : (["cdp-policies", "list"] as const),
  detail: (id: string) => ["cdp-policies", "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchPolicies(accountAddress?: string): Promise<CdpPolicy[]> {
  const params = new URLSearchParams();
  if (accountAddress) {
    params.set("accountAddress", accountAddress);
  }

  const url = `/api/cdp/policies${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  const json = (await response.json()) as ApiResponse<{ policies: CdpPolicy[] }>;

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Failed to fetch policies (${response.status})`);
  }

  return json.data?.policies ?? [];
}

async function fetchCreatePolicy(params: CreatePolicyParams): Promise<CdpPolicy> {
  const response = await fetch("/api/cdp/policies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await response.json()) as ApiResponse<{ policy: CdpPolicy }>;

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Failed to create policy (${response.status})`);
  }

  if (!json.data?.policy) {
    throw new Error("No policy returned from create");
  }

  return json.data.policy;
}

async function fetchUpdatePolicy(args: {
  policyId: string;
  params: UpdatePolicyParams;
}): Promise<CdpPolicy> {
  const response = await fetch(`/api/cdp/policies/${encodeURIComponent(args.policyId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args.params),
  });
  const json = (await response.json()) as ApiResponse<{ policy: CdpPolicy }>;

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Failed to update policy (${response.status})`);
  }

  if (!json.data?.policy) {
    throw new Error("No policy returned from update");
  }

  return json.data.policy;
}

async function fetchDeletePolicy(policyId: string): Promise<void> {
  const response = await fetch(`/api/cdp/policies/${encodeURIComponent(policyId)}`, {
    method: "DELETE",
  });
  const json = (await response.json()) as ApiResponse<{ deleted: boolean }>;

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Failed to delete policy (${response.status})`);
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Query hook to list CDP policies.
 *
 * @param accountAddress - Optional filter by wallet address
 * @returns React Query result with policies array
 */
export function useCdpPolicies(accountAddress?: string) {
  return useQuery({
    queryKey: cdpPolicyKeys.list(accountAddress),
    queryFn: () => fetchPolicies(accountAddress),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to create a CDP policy.
 *
 * On success, invalidates the policy list cache so the UI
 * automatically refetches the updated list.
 */
export function useCdpCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchCreatePolicy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cdpPolicyKeys.all });
    },
  });
}

/**
 * Mutation hook to update a CDP policy.
 *
 * On success, invalidates both the list cache and the specific
 * policy detail cache.
 */
export function useCdpUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchUpdatePolicy,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cdpPolicyKeys.all });
      void queryClient.invalidateQueries({
        queryKey: cdpPolicyKeys.detail(variables.policyId),
      });
    },
  });
}

/**
 * Mutation hook to delete a CDP policy.
 *
 * On success, invalidates the policy list cache and removes
 * the specific policy detail from cache.
 */
export function useCdpDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchDeletePolicy,
    onSuccess: (_data, policyId) => {
      void queryClient.invalidateQueries({ queryKey: cdpPolicyKeys.all });
      queryClient.removeQueries({
        queryKey: cdpPolicyKeys.detail(policyId),
      });
    },
  });
}
