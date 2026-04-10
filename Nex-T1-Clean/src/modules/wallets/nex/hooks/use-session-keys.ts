"use client";

/**
 * useSessionKeys Hook
 * Manages session keys for agent delegation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  grantAgentSessionKey,
  revokeSessionKey,
  revokeAllSessionKeys,
  listSessionKeys,
  createDefaultPermissions,
  parseDate,
  type SessionKeyPermissions,
  type SessionKeyRecord,
} from "../session-keys";

/**
 * Hook to manage session keys
 */
export function useSessionKeys() {
  const queryClient = useQueryClient();

  // List session keys
  const {
    data: sessionKeysData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["session-keys"],
    queryFn: async () => {
      const result = await listSessionKeys();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.sessionKeys ?? [];
    },
    staleTime: 30000, // 30 seconds
  });

  // Grant mutation
  const grantMutation = useMutation({
    mutationFn: async ({
      walletAddress,
      chainId,
      permissions,
      expiryMs,
      userEncryptionKey,
    }: {
      walletAddress: `0x${string}`;
      chainId: number;
      permissions: Omit<SessionKeyPermissions, "validUntil">;
      expiryMs?: number;
      /** Required: Encryption key for secure private key storage */
      userEncryptionKey: string;
    }) => {
      const result = await grantAgentSessionKey({
        walletAddress,
        chainId,
        permissions,
        expiryMs,
        userEncryptionKey,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-keys"] });
    },
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: async ({
      sessionKeyId,
      reason,
    }: {
      sessionKeyId: string;
      reason?: string;
    }) => {
      const result = await revokeSessionKey({ sessionKeyId, reason });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-keys"] });
    },
  });

  // Revoke all mutation
  const revokeAllMutation = useMutation({
    mutationFn: async ({
      walletAddress,
      chainId,
      reason,
    }: {
      walletAddress: `0x${string}`;
      chainId?: number;
      reason?: string;
    }) => {
      const result = await revokeAllSessionKeys({
        walletAddress,
        chainId,
        reason,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-keys"] });
    },
  });

  const isActiveSessionKey = (sk: SessionKeyRecord): boolean => {
    const expiresAt = parseDate(sk.expiresAt);
    const revokedAt = parseDate(sk.revokedAt);
    const now = Date.now();
    const notExpired = !expiresAt || expiresAt.getTime() > now;
    const notRevoked = !revokedAt;
    return notExpired && notRevoked;
  };

  const activeSessionKeys = (sessionKeysData ?? []).filter(isActiveSessionKey);

  return {
    // Data
    sessionKeys: sessionKeysData ?? [],
    activeSessionKeys,
    isLoading,
    error: error?.message,

    // Actions
    grant: grantMutation.mutateAsync,
    revoke: revokeMutation.mutateAsync,
    revokeAll: revokeAllMutation.mutateAsync,
    refresh: refetch,

    // Mutation states
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending || revokeAllMutation.isPending,

    // Helpers
    createDefaultPermissions,
  };
}

/**
 * Hook to check if agent has access to a specific wallet
 */
export function useHasAgentAccess({
  walletAddress,
  chainId,
}: {
  walletAddress?: `0x${string}` | null;
  chainId?: number;
}) {
  const { sessionKeys, isLoading } = useSessionKeys();

  if (!walletAddress || !chainId) {
    return { hasAccess: false, isLoading: false };
  }

  const activeKey = sessionKeys.find((sk) => {
    const expiresAt = parseDate(sk.expiresAt);
    const revokedAt = parseDate(sk.revokedAt);
    const now = Date.now();
    const isActive = !revokedAt && (!expiresAt || expiresAt.getTime() > now);
    return (
      isActive &&
      sk.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
      sk.chainId === chainId
    );
  });

  return {
    hasAccess: !!activeKey,
    isLoading,
    sessionKey: activeKey,
  };
}
