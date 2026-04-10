/**
 * Agent Session Key Signer
 * Server-side functions for agents to sign operations with delegated session keys
 */

import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createClient } from "@/server/services/supabase/server";
import { redis, isRedisConfigured } from "@/server/services/redis";
import type {
  ActiveSessionKey,
  SessionKeyPermissions,
  SessionKeyOperation,
  ValidationResult,
} from "./types";
import { validateSessionKeyOperation, parsePermissions } from "./validate";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Cumulative spend tracking via Redis
// ---------------------------------------------------------------------------

/** Redis key prefix for cumulative spend counters */
const CUMULATIVE_SPEND_PREFIX = "session_key_spend:";

/**
 * Build the Redis key for a session key's cumulative spend counter.
 * The key auto-expires when the session key expires.
 */
function cumulativeSpendKey(sessionKeyId: string): string {
  return `${CUMULATIVE_SPEND_PREFIX}${sessionKeyId}`;
}

/**
 * Get the cumulative spend (in wei) for a session key.
 * Returns 0n if Redis is unavailable or no spend has been recorded.
 */
async function getCumulativeSpend(sessionKeyId: string): Promise<bigint> {
  if (!isRedisConfigured) return 0n;

  try {
    const raw = await redis.get(cumulativeSpendKey(sessionKeyId));
    if (!raw) return 0n;
    return BigInt(String(raw));
  } catch (err) {
    logger.warn("[AgentSigner] Failed to read cumulative spend from Redis", {
      sessionKeyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0n;
  }
}

/**
 * Record spend for a session key after a successful operation.
 * Call this AFTER the on-chain transaction succeeds.
 *
 * @param sessionKeyId - The session key ID
 * @param value - The wei value spent in this operation
 * @param ttlSeconds - TTL for the counter (should match session key remaining life)
 */
export async function recordSessionKeySpend(
  sessionKeyId: string,
  value: bigint,
  ttlSeconds: number,
): Promise<void> {
  if (!isRedisConfigured || value <= 0n) return;

  try {
    const key = cumulativeSpendKey(sessionKeyId);
    // Redis client exposes `incr` (by 1) and `hincrby` but not `incrby`.
    // Use get-then-set pattern for arbitrary increments.
    const current = await redis.get(key);
    const currentNum = current ? Number(current) : 0;
    const newTotal = currentNum + Number(value);
    await redis.set(key, String(newTotal));

    // Set TTL to match session key expiry (only on first write)
    if (currentNum === 0 && redis.expire) {
      await redis.expire(key, Math.max(ttlSeconds, 60));
    }

    logger.info("[AgentSigner] Cumulative spend recorded", {
      sessionKeyId,
      operationValue: value.toString(),
      newTotal: String(newTotal),
    });
  } catch (err) {
    // Non-fatal: log but do not block the operation
    logger.warn("[AgentSigner] Failed to record cumulative spend in Redis", {
      sessionKeyId,
      value: value.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
/**
 * Decrypt a session key private key
 * This is the inverse of encryptSessionKeyForServer
 *
 * SECURITY: The encryption key is MANDATORY. Session keys are always stored
 * encrypted (enforced by encryptSessionKeyForServer in grant.ts). Allowing
 * a fallback to plain base64 would bypass mandatory encryption and expose
 * private keys.
 *
 * @throws Error if userEncryptionKey is absent or empty
 */
async function decryptSessionKey(
  encryptedKey: string,
  userEncryptionKey?: string
): Promise<`0x${string}`> {
  // SECURITY: Encryption key is mandatory -- never fall back to plain base64
  if (!userEncryptionKey || userEncryptionKey.trim().length === 0) {
    throw new Error(
      "Encryption key is required to decrypt session key. " +
      "Private keys must never be stored or transmitted unencrypted."
    );
  }

  // Decrypt using Web Crypto API
  const combined = new Uint8Array(Buffer.from(encryptedKey, "base64"));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userEncryptionKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted) as `0x${string}`;
}

/**
 * Get an active session key for a user's wallet
 * Returns null if no active session key exists
 */
export async function getActiveSessionKey({
  userId,
  walletAddress,
  chainId,
}: {
  userId: string;
  walletAddress: `0x${string}`;
  chainId: number;
}): Promise<ActiveSessionKey | null> {
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  // Use the database function to get active session key
  const { data, error } = await supabase.rpc("get_active_session_key", {
    p_user_id: userId,
    p_wallet_address: walletAddress.toLowerCase(),
    p_chain_id: chainId,
  });

  if (error) {
    logger.error("[AgentSigner] Error fetching session key:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    id: row.id,
    sessionPublicKey: row.session_public_key as `0x${string}`,
    encryptedSessionPrivateKey: row.encrypted_session_private_key,
    permissions: parsePermissions(row.permissions),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Get the session key signer account for agent operations
 * This creates a viem Account object that can sign transactions
 */
export async function getAgentSessionSigner({
  userId,
  walletAddress,
  chainId,
  userEncryptionKey,
}: {
  userId: string;
  walletAddress: `0x${string}`;
  chainId: number;
  /** Required: encryption key for decrypting the session private key */
  userEncryptionKey: string;
}): Promise<{
  signer: PrivateKeyAccount;
  permissions: SessionKeyPermissions;
  sessionKeyId: string;
}> {
  const activeKey = await getActiveSessionKey({
    userId,
    walletAddress,
    chainId,
  });

  if (!activeKey) {
    throw new Error(
      `No active session key for wallet ${walletAddress} on chain ${chainId}. ` +
        "User must grant agent permission first."
    );
  }

  // Decrypt the session private key
  const privateKey = await decryptSessionKey(
    activeKey.encryptedSessionPrivateKey,
    userEncryptionKey
  );

  // Create the signer account
  const signer = privateKeyToAccount(privateKey);

  return {
    signer,
    permissions: activeKey.permissions,
    sessionKeyId: activeKey.id,
  };
}

/**
 * Validate and prepare an operation for signing
 * Returns the signer if validation passes, or an error result
 */
export async function prepareAgentOperation({
  userId,
  walletAddress,
  chainId,
  operation,
  userEncryptionKey,
}: {
  userId: string;
  walletAddress: `0x${string}`;
  chainId: number;
  operation: SessionKeyOperation;
  /**
   * Encryption key for decrypting the session private key.
   * Required when signing; omit for validation-only checks where
   * the signer will return a validation error instead of proceeding.
   */
  userEncryptionKey?: string;
}): Promise<
  | {
      success: true;
      signer: PrivateKeyAccount;
      sessionKeyId: string;
    }
  | {
      success: false;
      error: string;
      validationResult?: ValidationResult;
    }
> {
  try {
    // Encryption key is required to decrypt the session key for signing.
    // If not provided, the operation cannot proceed (fall back to manual approval).
    if (!userEncryptionKey) {
      return {
        success: false,
        error: "Encryption key required to prepare agent operation for signing",
      };
    }

    // Get the session signer
    const { signer, permissions, sessionKeyId } = await getAgentSessionSigner({
      userId,
      walletAddress,
      chainId,
      userEncryptionKey,
    });

    // Validate the operation against per-transaction permissions
    const validation = validateSessionKeyOperation({
      permissions,
      operation,
    });

    if (!validation.valid) {
      // Log the permission denial
      await logSessionKeyEvent({
        sessionKeyId,
        eventType: "permission_denied",
        operationType: operation.method,
        operationValue: operation.value.toString(),
        operationTo: operation.to,
        success: false,
        errorMessage: validation.reason,
      });

      return {
        success: false,
        error: validation.reason || "Permission denied",
        validationResult: validation,
      };
    }

    // Cumulative spend check: ensure running total + this tx stays within
    // the session key's spending limit.
    const spendingLimitBigInt = BigInt(permissions.spendingLimit);
    const cumulativeSpent = await getCumulativeSpend(sessionKeyId);
    const projectedTotal = cumulativeSpent + operation.value;

    if (projectedTotal > spendingLimitBigInt) {
      const reason =
        `Cumulative spend ${projectedTotal.toString()} wei ` +
        `(current ${cumulativeSpent.toString()} + tx ${operation.value.toString()}) ` +
        `exceeds session key spending limit of ${permissions.spendingLimit} wei`;

      await logSessionKeyEvent({
        sessionKeyId,
        eventType: "permission_denied",
        operationType: operation.method,
        operationValue: operation.value.toString(),
        operationTo: operation.to,
        success: false,
        errorMessage: reason,
      });

      return {
        success: false,
        error: reason,
        validationResult: { valid: false, reason },
      };
    }

    return {
      success: true,
      signer,
      sessionKeyId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Log a session key event for audit
 */
export async function logSessionKeyEvent({
  sessionKeyId,
  eventType,
  operationType,
  operationValue,
  operationTo,
  success,
  errorMessage,
  ipAddress,
  userAgent,
}: {
  sessionKeyId: string;
  eventType: "granted" | "used" | "revoked" | "expired" | "permission_denied";
  operationType?: string;
  operationValue?: string;
  operationTo?: string;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    await supabase.rpc("log_session_key_usage", {
      p_session_key_id: sessionKeyId,
      p_event_type: eventType,
      p_operation_type: operationType ?? null,
      p_operation_value: operationValue ?? null,
      p_operation_to: operationTo ?? null,
      p_success: success ?? true,
      p_error_message: errorMessage ?? null,
      p_ip_address: ipAddress ?? null,
      p_user_agent: userAgent ?? null,
    });
  } catch (error) {
    logger.error("[AgentSigner] Failed to log event:", error);
  }
}

/**
 * Check if agent has active session key access for a wallet
 */
export async function hasAgentAccess({
  userId,
  walletAddress,
  chainId,
}: {
  userId: string;
  walletAddress: `0x${string}`;
  chainId: number;
}): Promise<boolean> {
  const activeKey = await getActiveSessionKey({
    userId,
    walletAddress,
    chainId,
  });
  return activeKey !== null;
}
