"use client";

import {
  useMutation,
  type UseMutationResult,
} from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Variables required to export a Nex Wallet private key via the API. */
export type CdpExportKeyVariables = {
  /** The wallet address whose key should be exported. */
  walletAddress: string;
};

/**
 * Result of a server-side CDP key export.
 *
 * SECURITY: For client-side iframe-based export (recommended), use
 * `CdpExportModal` from `@/components/wallets/cdp/cdp-export-modal`
 * instead. This hook exposes the raw private key to application JS
 * and should only be used when server-side access is required.
 */
export type CdpExportKeyResult = {
  privateKey: string;
  format: "hex" | "base58";
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

async function executeCdpExportKey(
  variables: CdpExportKeyVariables,
): Promise<CdpExportKeyResult> {
  const headers = await getAuthHeaders();

  const url = `/api/cdp/wallets/${encodeURIComponent(variables.walletAddress)}/export-keys`;

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to export Nex Wallet key");
  }

  const payload = (await response.json()) as { data?: CdpExportKeyResult };
  const data = payload.data;

  if (!data?.privateKey) {
    throw new Error("CDP export response missing private key");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Mutation hook to export a Nex Wallet private key via the server-side API.
 *
 * **Security note**: This hook exposes the private key to application
 * JavaScript. For a more secure export path, prefer the iframe-based
 * `CdpExportModal` component which keeps the key in an isolated CDP iframe.
 *
 * @returns `{ exportKey, isPending, error, data, reset }`.
 */
export function useCdpExportKey(): {
  exportKey: UseMutationResult<CdpExportKeyResult, Error, CdpExportKeyVariables>["mutateAsync"];
  isPending: boolean;
  error: Error | null;
  data: CdpExportKeyResult | undefined;
  reset: () => void;
} {
  const mutation = useMutation<
    CdpExportKeyResult,
    Error,
    CdpExportKeyVariables
  >({
    mutationFn: executeCdpExportKey,
  });

  return {
    exportKey: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
