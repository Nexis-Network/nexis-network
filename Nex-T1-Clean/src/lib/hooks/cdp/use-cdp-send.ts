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

/** Variables required to execute a CDP send transaction. */
export type CdpSendVariables = {
  /** The sender wallet address (used in the API route path). */
  fromAddress: string;
  /** The recipient address. */
  toAddress: string;
  /** Amount to send as a string (supports arbitrary precision). */
  amount: string;
  /** Optional ERC-20 / SPL token address. Omit for native sends. */
  tokenAddress?: string;
  /** Target chain ID. */
  chainId: number | string;
  /** Platform: `"evm"` or `"solana"`. */
  platform: "evm" | "solana";
};

/** Result returned after a successful send transaction. */
export type CdpSendResult = {
  txHash: string;
  status: string;
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

async function executeCdpSend(
  variables: CdpSendVariables,
): Promise<CdpSendResult> {
  const headers = await getAuthHeaders();

  const url = `/api/cdp/wallets/${encodeURIComponent(variables.fromAddress)}/send`;

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({
      toAddress: variables.toAddress,
      amount: variables.amount,
      tokenAddress: variables.tokenAddress,
      chainId: variables.chainId,
      platform: variables.platform,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to execute CDP send transaction");
  }

  const payload = (await response.json()) as { data?: CdpSendResult };
  const data = payload.data;

  if (!data) {
    throw new Error("CDP send response missing data");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Mutation hook to send tokens from a Nex Wallet.
 *
 * On successful send, automatically invalidates the balance query for the
 * sender address so the UI reflects the updated balance.
 *
 * @returns `{ send, isPending, error, data, reset }`.
 */
export function useCdpSend(): {
  send: UseMutationResult<CdpSendResult, Error, CdpSendVariables>["mutateAsync"];
  isPending: boolean;
  error: Error | null;
  data: CdpSendResult | undefined;
  reset: () => void;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<CdpSendResult, Error, CdpSendVariables>({
    mutationFn: executeCdpSend,
    onSuccess: (_data, variables) => {
      queryClient
        .invalidateQueries({
          queryKey: ["cdp-balance", variables.fromAddress],
        })
        .catch(() => {});
    },
  });

  return {
    send: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
