/**
 * Session Key Revocation Operations
 * Functions for revoking session keys and managing their lifecycle
 */

import type { RevokeSessionKeyResult, SessionKeyRecord } from "./types";

/**
 * Revoke a session key
 * This immediately invalidates the session key, preventing further agent operations
 */
export async function revokeSessionKey({
  sessionKeyId,
  reason = "User revoked",
}: {
  sessionKeyId: string;
  reason?: string;
}): Promise<RevokeSessionKeyResult> {
  try {
    const response = await fetch("/api/wallets/session-keys/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionKeyId,
        reason,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to revoke session key: ${error}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Revoke all session keys for a wallet
 * Useful when the user wants to immediately revoke all agent access
 */
export async function revokeAllSessionKeys({
  walletAddress,
  chainId,
  reason = "User revoked all",
}: {
  walletAddress: `0x${string}`;
  chainId?: number;
  reason?: string;
}): Promise<RevokeSessionKeyResult> {
  try {
    const response = await fetch("/api/wallets/session-keys/revoke-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        chainId,
        reason,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to revoke session keys: ${error}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * List all session keys for the current user
 */
export async function listSessionKeys(): Promise<{
  success: boolean;
  sessionKeys?: SessionKeyRecord[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/wallets/session-keys/list", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to list session keys: ${error}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      sessionKeys: data.sessionKeys,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get session key details
 */
export async function getSessionKeyDetails(sessionKeyId: string): Promise<{
  success: boolean;
  sessionKey?: SessionKeyRecord;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/wallets/session-keys/${sessionKeyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to get session key: ${error}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      sessionKey: data.sessionKey,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
