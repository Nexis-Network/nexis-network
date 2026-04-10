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

export type LinkedAuthMethodType =
  | "email"
  | "sms"
  | "wallet"
  | "google"
  | "apple"
  | "x"
  | "github"
  | "discord"
  | "unknown";

/** A linked authentication method. */
export type LinkedAuthMethod = {
  id: string;
  type: LinkedAuthMethodType;
  identifier: string;
  linkedAt: string;
  isPrimary: boolean;
};

/** Result of initiating an email or phone linking flow. */
export type LinkFlowResult = {
  flowId: string;
  email?: string;
  phone?: string;
  expiresAt: string;
};

/** Return type for the useCdpAuthLinking hook. */
export type UseCdpAuthLinkingResult = {
  /** List of currently linked authentication methods. */
  methods: LinkedAuthMethod[];
  /** Whether the methods query is loading. */
  isLoading: boolean;
  /** Query error when methods could not be loaded. */
  error: Error | null;
  /** Underlying query result for advanced usage. */
  methodsQuery: UseQueryResult<LinkedAuthMethod[], Error>;
  /** Initiate email linking. Returns a flow ID for OTP verification. */
  linkEmail: (email: string) => Promise<LinkFlowResult>;
  /** Verify an email linking flow with an OTP code. */
  verifyEmailLink: (flowId: string, code: string) => Promise<void>;
  /** Initiate phone linking. Returns a flow ID for OTP verification. */
  linkPhone: (phone: string) => Promise<LinkFlowResult>;
  /** Verify a phone linking flow with an OTP code. */
  verifyPhoneLink: (flowId: string, code: string) => Promise<void>;
  /** Remove a linked authentication method by its ID. */
  unlinkMethod: (methodId: string) => Promise<void>;
  /** Whether an email link mutation is in-flight. */
  isLinkingEmail: boolean;
  /** Whether a verify mutation is in-flight. */
  isVerifying: boolean;
  /** Whether an unlink mutation is in-flight. */
  isUnlinking: boolean;
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

const AUTH_LINKS_KEY = ["cdp-auth-links"] as const;

const LINKED_METHOD_TYPE_ALIASES: Readonly<Record<string, LinkedAuthMethodType>> = {
  email: "email",
  sms: "sms",
  phone: "sms",
  wallet: "wallet",
  google: "google",
  "oauth:google": "google",
  apple: "apple",
  "oauth:apple": "apple",
  x: "x",
  twitter: "x",
  "oauth:x": "x",
  github: "github",
  "oauth:github": "github",
  discord: "discord",
  "oauth:discord": "discord",
};

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

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type LinkedMethodsPayload = {
  data?: {
    methods?: unknown;
  };
};

function toErrorMessage(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function extractApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  return (
    toErrorMessage(payload?.error?.message) ??
    toErrorMessage(response.statusText) ??
    fallback
  );
}

function normalizeLinkedAuthMethodType(value: unknown): LinkedAuthMethodType {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  return LINKED_METHOD_TYPE_ALIASES[key] ?? "unknown";
}

function normalizeLinkedAuthMethod(input: unknown): LinkedAuthMethod | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const id = toErrorMessage(candidate.id);
  const identifier = toErrorMessage(candidate.identifier);
  const linkedAt = toErrorMessage(candidate.linkedAt) ?? new Date(0).toISOString();

  if (!id || !identifier) {
    return null;
  }

  return {
    id,
    type: normalizeLinkedAuthMethodType(candidate.type),
    identifier,
    linkedAt,
    isPrimary: candidate.isPrimary === true,
  };
}

export function normalizeLinkedMethodsResponse(payload: unknown): LinkedAuthMethod[] {
  const parsed = payload as LinkedMethodsPayload | null;
  const methods = parsed?.data?.methods;

  if (!Array.isArray(methods)) {
    throw new Error("Linked methods response must contain an array");
  }

  return methods
    .map((method) => normalizeLinkedAuthMethod(method))
    .filter((method): method is LinkedAuthMethod => method !== null);
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchLinkedMethods(
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<LinkedAuthMethod[]> {
  const response = await fetch("/api/cdp/auth/link/methods", {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      await extractApiErrorMessage(response, "Failed to fetch linked methods"),
    );
  }

  return normalizeLinkedMethodsResponse(await response.json());
}

async function requestLinkEmail(
  headers: Record<string, string>,
  email: string,
): Promise<LinkFlowResult> {
  const response = await fetch("/api/cdp/auth/link/email", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(
      await extractApiErrorMessage(response, "Failed to initiate email linking"),
    );
  }

  const payload = (await response.json()) as { data?: LinkFlowResult };
  if (!payload.data) {
    throw new Error("Email link response missing data");
  }
  return payload.data;
}

async function requestVerifyLink(
  headers: Record<string, string>,
  flowId: string,
  code: string,
): Promise<void> {
  const response = await fetch("/api/cdp/auth/link/verify", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ flowId, code }),
  });

  if (!response.ok) {
    throw new Error(
      await extractApiErrorMessage(response, "Failed to verify linking code"),
    );
  }
}

async function requestUnlink(
  headers: Record<string, string>,
  methodId: string,
): Promise<void> {
  const response = await fetch("/api/cdp/auth/link/unlink", {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify({ methodId }),
  });

  if (!response.ok) {
    throw new Error(
      await extractApiErrorMessage(response, "Failed to unlink method"),
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Client-side hook for managing CDP authentication method linking.
 *
 * Fetches the list of linked methods and provides mutations for linking
 * email/phone and unlinking methods.
 *
 * Methods list is re-fetched on window focus and after every mutation.
 */
export function useCdpAuthLinking(): UseCdpAuthLinkingResult {
  const queryClient = useQueryClient();
  const { isAuthenticated, session } = useAuthContext();
  const authHeaders = useMemo(
    () => buildAuthHeaders(session?.access_token ?? null),
    [session?.access_token],
  );
  const canQuery = typeof window !== "undefined" && isAuthenticated;

  const methodsQuery = useQuery<LinkedAuthMethod[], Error>({
    queryKey: AUTH_LINKS_KEY,
    queryFn: ({ signal }) => fetchLinkedMethods(authHeaders, signal),
    enabled: canQuery,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const invalidateMethods = useCallback(() => {
    queryClient
      .invalidateQueries({ queryKey: AUTH_LINKS_KEY })
      .catch(() => {});
  }, [queryClient]);

  const linkEmailMutation = useMutation<LinkFlowResult, Error, string>({
    mutationFn: (email: string) => requestLinkEmail(authHeaders, email),
  });

  const verifyMutation = useMutation<
    void,
    Error,
    { flowId: string; code: string }
  >({
    mutationFn: ({ flowId, code }) => requestVerifyLink(authHeaders, flowId, code),
    onSuccess: invalidateMethods,
  });

  const unlinkMutation = useMutation<void, Error, string>({
    mutationFn: (methodId: string) => requestUnlink(authHeaders, methodId),
    onSuccess: invalidateMethods,
  });

  return {
    methods: methodsQuery.data ?? [],
    isLoading: methodsQuery.isLoading,
    error: methodsQuery.error ?? null,
    methodsQuery,
    linkEmail: linkEmailMutation.mutateAsync,
    verifyEmailLink: async (flowId: string, code: string) => {
      await verifyMutation.mutateAsync({ flowId, code });
    },
    linkPhone: async (_phone: string) => {
      // Phone linking uses the same email flow endpoint structure.
      // When the phone linking API route is implemented, swap the URL.
      // For now, this provides the interface contract.
      throw new Error(
        "Phone linking is not yet available. Use email linking instead.",
      );
    },
    verifyPhoneLink: async (_flowId: string, _code: string) => {
      throw new Error(
        "Phone linking verification is not yet available.",
      );
    },
    unlinkMethod: unlinkMutation.mutateAsync,
    isLinkingEmail: linkEmailMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
  };
}
