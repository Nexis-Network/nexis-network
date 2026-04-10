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

export type CdpCharge = {
  id: string;
  code: string;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  status: "new" | "pending" | "completed" | "expired" | "cancelled";
  hostedUrl: string;
  createdAt: string;
  expiresAt: string;
  payments: Array<{
    network: string;
    transactionHash: string;
    status: string;
  }>;
};

export type CreateChargeInput = {
  name: string;
  description?: string;
  amount: string;
  currency: string;
  pricingType: "fixed_price" | "no_price";
  metadata?: Record<string, string>;
  redirectUrl?: string;
  cancelUrl?: string;
};

export type CdpChargesListOptions = {
  limit?: number;
  status?: string;
  enabled?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const CHARGES_KEY = (limit?: number, status?: string) =>
  ["cdp-commerce-charges", limit, status] as const;

const CHARGE_KEY = (chargeId: string) =>
  ["cdp-commerce-charge", chargeId] as const;

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

async function fetchCreateCharge(
  input: CreateChargeInput,
): Promise<CdpCharge> {
  const headers = await getAuthHeaders();

  const response = await fetch("/api/cdp/commerce/charges", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to create charge");
  }

  const payload = (await response.json()) as { data?: CdpCharge };
  if (!payload.data) {
    throw new Error("Invalid response from create charge");
  }

  return payload.data;
}

async function fetchChargeStatus(
  chargeId: string,
  signal?: AbortSignal,
): Promise<CdpCharge> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `/api/cdp/commerce/charges/${encodeURIComponent(chargeId)}`,
    {
      method: "GET",
      headers,
      signal,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch charge status");
  }

  const payload = (await response.json()) as { data?: CdpCharge };
  if (!payload.data) {
    throw new Error("Invalid response from get charge");
  }

  return payload.data;
}

async function fetchChargesList(
  limit?: number,
  status?: string,
  signal?: AbortSignal,
): Promise<CdpCharge[]> {
  const headers = await getAuthHeaders();

  const params = new URLSearchParams();
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  const url = `/api/cdp/commerce/charges${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to list charges");
  }

  const payload = (await response.json()) as { data?: CdpCharge[] };
  return payload.data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a new Coinbase Commerce charge.
 *
 * Returns a mutation that accepts `CreateChargeInput` and creates
 * a payment charge. On success, invalidates the charges list cache.
 */
export function useCdpCreateCharge(): UseMutationResult<
  CdpCharge,
  Error,
  CreateChargeInput
> {
  const queryClient = useQueryClient();

  return useMutation<CdpCharge, Error, CreateChargeInput>({
    mutationFn: fetchCreateCharge,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cdp-commerce-charges"],
      });
    },
  });
}

/**
 * Poll the status of a single Coinbase Commerce charge.
 *
 * Automatically polls every 5 seconds while the charge is in
 * "new" or "pending" status. Stops polling when the charge reaches
 * a terminal state (completed, expired, cancelled).
 *
 * @param chargeId - The charge ID to poll. Pass `undefined` to disable.
 */
export function useCdpChargeStatus(
  chargeId: string | undefined,
): {
  charge: CdpCharge | undefined;
  isLoading: boolean;
  error: Error | null;
  isTerminal: boolean;
} {
  const query: UseQueryResult<CdpCharge, Error> = useQuery<
    CdpCharge,
    Error
  >({
    queryKey: CHARGE_KEY(chargeId ?? ""),
    queryFn: ({ signal }) => fetchChargeStatus(chargeId!, signal),
    enabled: !!chargeId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling on terminal states
      if (
        status === "completed" ||
        status === "expired" ||
        status === "cancelled"
      ) {
        return false;
      }
      // Poll every 5 seconds for active charges
      return 5_000;
    },
    staleTime: 3_000,
    refetchOnWindowFocus: true,
  });

  const status = query.data?.status;
  const isTerminal =
    status === "completed" ||
    status === "expired" ||
    status === "cancelled";

  return {
    charge: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isTerminal,
  };
}

/**
 * List Coinbase Commerce charges.
 *
 * @param options - Optional limit, status filter, and enabled flag.
 */
export function useCdpCharges(
  options?: CdpChargesListOptions,
): {
  charges: CdpCharge[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query: UseQueryResult<CdpCharge[], Error> = useQuery<
    CdpCharge[],
    Error
  >({
    queryKey: CHARGES_KEY(options?.limit, options?.status),
    queryFn: ({ signal }) =>
      fetchChargesList(options?.limit, options?.status, signal),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return {
    charges: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}
