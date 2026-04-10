/**
 * Session Key Permission Validation
 * Validates that agent operations comply with granted session key permissions
 */

import type {
  SessionKeyPermissions,
  SessionKeyOperation,
  ValidationResult,
} from "./types";

/**
 * Validate an operation against session key permissions
 * This is called before the agent can execute a transaction
 */
export function validateSessionKeyOperation({
  permissions,
  operation,
}: {
  permissions: SessionKeyPermissions;
  operation: SessionKeyOperation;
}): ValidationResult {
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > permissions.validUntil) {
    return {
      valid: false,
      reason: `Session key expired at ${new Date(permissions.validUntil * 1000).toISOString()}`,
    };
  }

  // Check spending limit
  const spendingLimitBigInt = BigInt(permissions.spendingLimit);
  if (operation.value > spendingLimitBigInt) {
    return {
      valid: false,
      reason: `Transaction value ${operation.value.toString()} wei exceeds spending limit ${permissions.spendingLimit} wei`,
    };
  }

  // Check contract whitelist (if specified)
  if (permissions.contractWhitelist.length > 0) {
    const isWhitelisted = permissions.contractWhitelist.some(
      (addr) => addr.toLowerCase() === operation.to.toLowerCase()
    );
    if (!isWhitelisted) {
      return {
        valid: false,
        reason: `Contract ${operation.to} is not in the whitelist. Allowed: ${permissions.contractWhitelist.join(", ")}`,
      };
    }
  }

  // Check allowed methods (if specified)
  if (permissions.allowedMethods && permissions.allowedMethods.length > 0 && operation.method) {
    const isMethodAllowed = permissions.allowedMethods.some(
      (method) => method.toLowerCase() === operation.method?.toLowerCase()
    );
    if (!isMethodAllowed) {
      return {
        valid: false,
        reason: `Method ${operation.method} is not allowed. Permitted methods: ${permissions.allowedMethods.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if a session key is still active (not expired, not revoked)
 */
export function isSessionKeyActive(
  expiresAt: Date,
  revokedAt: Date | null
): boolean {
  if (revokedAt !== null) {
    return false;
  }
  return new Date() < expiresAt;
}

/**
 * Calculate remaining time for a session key
 */
export function getSessionKeyRemainingTime(expiresAt: Date): {
  expired: boolean;
  remainingMs: number;
  remainingHuman: string;
} {
  const now = Date.now();
  const expiryTime = expiresAt.getTime();
  const remainingMs = expiryTime - now;

  if (remainingMs <= 0) {
    return {
      expired: true,
      remainingMs: 0,
      remainingHuman: "Expired",
    };
  }

  // Convert to human-readable format
  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let remainingHuman: string;
  if (days > 0) {
    remainingHuman = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    remainingHuman = `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    remainingHuman = `${minutes}m ${seconds % 60}s`;
  } else {
    remainingHuman = `${seconds}s`;
  }

  return {
    expired: false,
    remainingMs,
    remainingHuman,
  };
}

/**
 * Parse permissions from database JSONB format
 */
export function parsePermissions(raw: UntypedJson): SessionKeyPermissions {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid permissions format");
  }

  const obj = raw as Record<string, UntypedJson>;

  return {
    spendingLimit: String(obj.spendingLimit ?? "0"),
    contractWhitelist: (obj.contractWhitelist as `0x${string}`[]) ?? [],
    allowedMethods: obj.allowedMethods as string[] | undefined,
    validUntil: Number(obj.validUntil ?? 0),
  };
}

/**
 * Serialize permissions for database storage
 */
export function serializePermissions(
  permissions: SessionKeyPermissions
): Record<string, UntypedJson> {
  return {
    spendingLimit: permissions.spendingLimit,
    contractWhitelist: permissions.contractWhitelist,
    allowedMethods: permissions.allowedMethods,
    validUntil: permissions.validUntil,
  };
}
