"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Variables required to execute a CDP swap. */
export type CdpSwapVariables = {
  /** The wallet address executing the swap. */
  walletAddress: string;
  /** Source token contract address (or native identifier). */
  fromToken: string;
  /** Destination token contract address (or native identifier). */
  toToken: string;
  /** Amount to swap as a string (supports arbitrary precision). */
  amount: string;
  /** Optional slippage tolerance in basis points (e.g. 50 = 0.5%). */
  slippageBps?: number;
  /** Target chain ID. */
  chainId: number;
};

/** Result returned after a successful swap execution. */
export type CdpSwapResult = {
  txHash: string;
  fromAmount: string;
  toAmount: string;
};

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
/*  Mutation function                                                   */
/* ------------------------------------------------------------------ */

async function executeCdpSwap(
  variables: CdpSwapVariables,
): Promise<CdpSwapResult> {
  const headers = await getAuthHeaders();

  const url = `/api/cdp/wallets/${encodeURIComponent(variables.walletAddress)}/swap`;

  const body: Record<string, unknown> = {
    fromToken: variables.fromToken,
    toToken: variables.toToken,
    amount: variables.amount,
    chainId: variables.chainId,
  };

  if (typeof variables.slippageBps === "number") {
    body.slippageBps = variables.slippageBps;
  }

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to execute CDP swap");
  }

  const payload = (await response.json()) as { data?: CdpSwapResult };
  const data = payload.data;

  if (!data) {
    throw new Error("CDP swap response missing data");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Mutation hook to execute a token swap via a Nex Wallet.
 *
 * On successful swap, automatically invalidates the balance query for the
 * wallet address so the UI reflects updated token balances.
 *
 * @returns `{ executeSwap, isPending, error, data, reset }`.
 */
export function useCdpSwapExecute(): {
  executeSwap: UseMutationResult<CdpSwapResult, Error, CdpSwapVariables>["mutateAsync"];
  isPending: boolean;
  error: Error | null;
  data: CdpSwapResult | undefined;
  reset: () => void;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<CdpSwapResult, Error, CdpSwapVariables>({
    mutationFn: executeCdpSwap,
    onSuccess: (_data, variables) => {
      queryClient
        .invalidateQueries({
          queryKey: ["cdp-balance", variables.walletAddress],
        })
        .catch(() => {});
    },
  });

  return {
    executeSwap: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
