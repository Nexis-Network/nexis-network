"use client";

import { useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/auth/use-auth-context";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single MFA method record. */
export type MfaMethod = {
  id: string;
  type: "totp" | "sms" | "email";
  label: string;
  enabled: boolean;
  createdAt?: string;
};

/** Result of initiating TOTP setup. */
export type TotpSetupResult = {
  qrCodeUri: string;
  secret: string;
  backupCodes: string[];
};

/** MFA status returned from the status endpoint. */
export type MfaStatus = {
  enabled: boolean;
  type: "totp" | null;
  enrolledAt: string | null;
  pendingSetup: boolean;
};

/** Return type for the useCdpMfa hook. */
export type UseCdpMfaResult = {
  /** List of MFA methods (currently only TOTP). */
  methods: MfaMethod[];
  /** Whether the status query is loading. */
  isLoading: boolean;
  /** Whether TOTP is currently enabled and verified. */
  isEnabled: boolean;
  /** Whether there is a pending (unverified) setup. */
  isPendingSetup: boolean;
  /** Underlying query result for advanced usage. */
  statusQuery: UseQueryResult<MfaStatus, Error>;
  /** Initiate TOTP setup. Returns QR URI, secret, and backup codes. */
  enableTotp: () => Promise<TotpSetupResult>;
  /** Verify a TOTP code (completes setup or validates). */
  verifyTotp: (code: string) => Promise<boolean>;
  /** Disable TOTP (requires current code). */
  disableTotp: (code: string) => Promise<void>;
  /** Whether an enable mutation is in-flight. */
  isEnabling: boolean;
  /** Whether a verify mutation is in-flight. */
  isVerifying: boolean;
  /** Whether a disable mutation is in-flight. */
  isDisabling: boolean;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const MFA_STATUS_KEY = ["cdp-mfa-status"] as const;

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

function buildAuthHeaders(accessToken: string | null): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchMfaStatus(
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<MfaStatus> {
  const response = await fetch("/api/cdp/auth/mfa/status", {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to fetch MFA status");
  }

  const payload = (await response.json()) as { data?: MfaStatus };
  if (!payload.data) {
    throw new Error("MFA status response missing data");
  }
  return payload.data;
}

async function requestEnableTotp(
  headers: Record<string, string>,
): Promise<TotpSetupResult> {
  const response = await fetch("/api/cdp/auth/mfa/enable", {
    method: "POST",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to initiate TOTP setup");
  }

  const payload = (await response.json()) as { data?: TotpSetupResult };
  if (!payload.data) {
    throw new Error("TOTP enable response missing data");
  }
  return payload.data;
}

async function requestVerifyTotp(
  headers: Record<string, string>,
  code: string,
): Promise<{ verified: boolean }> {
  const response = await fetch("/api/cdp/auth/mfa/verify", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to verify TOTP code");
  }

  const payload = (await response.json()) as {
    data?: { verified: boolean };
  };
  if (!payload.data) {
    throw new Error("TOTP verify response missing data");
  }
  return payload.data;
}

async function requestDisableTotp(
  headers: Record<string, string>,
  code: string,
): Promise<void> {
  const response = await fetch("/api/cdp/auth/mfa/disable", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Failed to disable TOTP");
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Client-side hook for managing CDP MFA (TOTP).
 *
 * Fetches the current MFA status and provides mutations for enabling,
 * verifying, and disabling TOTP two-factor authentication.
 *
 * Status is re-fetched on window focus and after every mutation.
 */
export function useCdpMfa(): UseCdpMfaResult {
  const queryClient = useQueryClient();
  const { isAuthenticated, session } = useAuthContext();
  const authHeaders = useMemo(
    () => buildAuthHeaders(session?.access_token ?? null),
    [session?.access_token],
  );
  const canQuery = typeof window !== "undefined" && isAuthenticated;

  const statusQuery = useQuery<MfaStatus, Error>({
    queryKey: MFA_STATUS_KEY,
    queryFn: ({ signal }) => fetchMfaStatus(authHeaders, signal),
    enabled: canQuery,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidateStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: MFA_STATUS_KEY }).catch(() => {});
  }, [queryClient]);

  const enableMutation = useMutation<TotpSetupResult, Error, void>({
    mutationFn: () => requestEnableTotp(authHeaders),
    onSuccess: invalidateStatus,
  });

  const verifyMutation = useMutation<{ verified: boolean }, Error, string>({
    mutationFn: (code: string) => requestVerifyTotp(authHeaders, code),
    onSuccess: invalidateStatus,
  });

  const disableMutation = useMutation<void, Error, string>({
    mutationFn: (code: string) => requestDisableTotp(authHeaders, code),
    onSuccess: invalidateStatus,
  });

  const isEnabled = statusQuery.data?.enabled === true;
  const isPendingSetup = statusQuery.data?.pendingSetup === true;

  const methods: MfaMethod[] = isEnabled
    ? [
        {
          id: "totp-primary",
          type: "totp",
          label: "Authenticator App",
          enabled: true,
          createdAt: statusQuery.data?.enrolledAt ?? undefined,
        },
      ]
    : [];

  return {
    methods,
    isLoading: statusQuery.isLoading,
    isEnabled,
    isPendingSetup,
    statusQuery,
    enableTotp: enableMutation.mutateAsync,
    verifyTotp: async (code: string) => {
      const result = await verifyMutation.mutateAsync(code);
      return result.verified;
    },
    disableTotp: async (code: string) => {
      await disableMutation.mutateAsync(code);
    },
    isEnabling: enableMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isDisabling: disableMutation.isPending,
  };
}
