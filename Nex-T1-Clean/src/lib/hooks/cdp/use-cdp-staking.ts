"use client";

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

/** A single staking position returned from the positions API. */
export type CdpStakingPosition = {
  stakeId: string;
  asset: "eth" | "sol";
  amount: string;
  rewards: string;
  apy: number;
  status: "active" | "unbonding" | "completed";
  startedAt: string;
  network: string;
};

/** Aggregated rewards result from the rewards API. */
export type CdpStakingRewardsResult = {
  walletAddress: string;
  totalRewards: string;
  totalRewardsUsd: number;
  positions: Array<{
    stakeId: string;
    asset: "eth" | "sol";
    rewards: string;
    rewardsUsd: number;
    apy: number;
  }>;
};

/** Variables for staking mutations. */
export type CdpStakeVariables = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  network?: string;
};

/** Variables for unstaking mutations. */
export type CdpUnstakeVariables = {
  walletAddress: string;
  amount: string;
  asset: "eth" | "sol";
  stakeId?: string;
  network?: string;
};

/** Result returned after a successful stake/unstake operation. */
export type CdpStakeResult = {
  stakeId: string;
  txHash: string;
  amount: string;
  asset: string;
  status: "pending" | "active" | "completed";
  estimatedApy: number;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const CDP_STAKING_POSITIONS_KEY = (address: string) =>
  ["cdp-staking-positions", address] as const;

const CDP_STAKING_REWARDS_KEY = (address: string) =>
  ["cdp-staking-rewards", address] as const;

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
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

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchStakingPositions(
  walletAddress: string,
): Promise<CdpStakingPosition[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ walletAddress });

  const response = await fetch(
    `/api/cdp/staking/positions?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch staking positions");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: CdpStakingPosition[];
    error?: { message: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Failed to fetch staking positions");
  }

  return payload.data;
}

async function fetchStakingRewards(
  walletAddress: string,
): Promise<CdpStakingRewardsResult> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ walletAddress });

  const response = await fetch(
    `/api/cdp/staking/rewards?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch staking rewards");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: CdpStakingRewardsResult;
    error?: { message: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Failed to fetch staking rewards");
  }

  return payload.data;
}

async function executeStake(
  variables: CdpStakeVariables,
): Promise<CdpStakeResult> {
  const headers = await getAuthHeaders();

  const response = await fetch("/api/cdp/staking/stake", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({
      walletAddress: variables.walletAddress,
      amount: variables.amount,
      asset: variables.asset,
      network: variables.network,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to execute staking operation");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: CdpStakeResult;
    error?: { message: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Staking response missing data");
  }

  return payload.data;
}

async function executeUnstake(
  variables: CdpUnstakeVariables,
): Promise<CdpStakeResult> {
  const headers = await getAuthHeaders();

  const response = await fetch("/api/cdp/staking/unstake", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({
      walletAddress: variables.walletAddress,
      amount: variables.amount,
      asset: variables.asset,
      stakeId: variables.stakeId,
      network: variables.network,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to execute unstaking operation");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: CdpStakeResult;
    error?: { message: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Unstaking response missing data");
  }

  return payload.data;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Query hook to fetch staking positions for a Nex Wallet.
 *
 * Automatically refetches every 60 seconds to stay current.
 * Disabled when walletAddress is undefined/empty.
 *
 * @param walletAddress - The Nex Wallet address (or undefined to disable)
 * @returns React Query result with staking positions
 */
export function useCdpStakingPositions(
  walletAddress: string | undefined,
): UseQueryResult<CdpStakingPosition[], Error> {
  return useQuery<CdpStakingPosition[], Error>({
    queryKey: CDP_STAKING_POSITIONS_KEY(walletAddress ?? ""),
    queryFn: () => fetchStakingPositions(walletAddress!),
    enabled: Boolean(walletAddress && walletAddress.length > 0),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}

/**
 * Query hook to fetch staking rewards for a Nex Wallet.
 *
 * Automatically refetches every 60 seconds to stay current.
 * Disabled when walletAddress is undefined/empty.
 *
 * @param walletAddress - The Nex Wallet address (or undefined to disable)
 * @returns React Query result with staking rewards
 */
export function useCdpStakingRewards(
  walletAddress: string | undefined,
): UseQueryResult<CdpStakingRewardsResult, Error> {
  return useQuery<CdpStakingRewardsResult, Error>({
    queryKey: CDP_STAKING_REWARDS_KEY(walletAddress ?? ""),
    queryFn: () => fetchStakingRewards(walletAddress!),
    enabled: Boolean(walletAddress && walletAddress.length > 0),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}

/**
 * Mutation hook to stake assets from a Nex Wallet.
 *
 * On success, invalidates positions and rewards queries so the UI
 * reflects the updated staking state.
 *
 * @returns Mutation result with stake/mutateAsync/isPending/error
 */
export function useCdpStake(): {
  stake: UseMutationResult<CdpStakeResult, Error, CdpStakeVariables>["mutateAsync"];
  isPending: boolean;
  error: Error | null;
  data: CdpStakeResult | undefined;
  reset: () => void;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<CdpStakeResult, Error, CdpStakeVariables>({
    mutationFn: executeStake,
    onSuccess: (_data, variables) => {
      // Invalidate positions and rewards for the staked wallet
      queryClient
        .invalidateQueries({
          queryKey: CDP_STAKING_POSITIONS_KEY(variables.walletAddress),
        })
        .catch(() => {});
      queryClient
        .invalidateQueries({
          queryKey: CDP_STAKING_REWARDS_KEY(variables.walletAddress),
        })
        .catch(() => {});
      // Also invalidate balance queries since staking reduces available balance
      queryClient
        .invalidateQueries({
          queryKey: ["cdp-balance", variables.walletAddress],
        })
        .catch(() => {});
    },
  });

  return {
    stake: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Mutation hook to unstake assets from a Nex Wallet.
 *
 * On success, invalidates positions and rewards queries so the UI
 * reflects the updated staking state.
 *
 * @returns Mutation result with unstake/mutateAsync/isPending/error
 */
export function useCdpUnstake(): {
  unstake: UseMutationResult<CdpStakeResult, Error, CdpUnstakeVariables>["mutateAsync"];
  isPending: boolean;
  error: Error | null;
  data: CdpStakeResult | undefined;
  reset: () => void;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<CdpStakeResult, Error, CdpUnstakeVariables>({
    mutationFn: executeUnstake,
    onSuccess: (_data, variables) => {
      queryClient
        .invalidateQueries({
          queryKey: CDP_STAKING_POSITIONS_KEY(variables.walletAddress),
        })
        .catch(() => {});
      queryClient
        .invalidateQueries({
          queryKey: CDP_STAKING_REWARDS_KEY(variables.walletAddress),
        })
        .catch(() => {});
      queryClient
        .invalidateQueries({
          queryKey: ["cdp-balance", variables.walletAddress],
        })
        .catch(() => {});
    },
  });

  return {
    unstake: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
