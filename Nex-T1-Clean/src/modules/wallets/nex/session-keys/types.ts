/**
 * Session Key Types for Agent Delegation
 * ERC-4337 session keys allow delegating scoped permissions to AI agents
 */

/**
 * Permissions that can be granted to a session key
 */
export interface SessionKeyPermissions {
  /** Maximum value (in wei) that can be transferred per transaction */
  spendingLimit: string;
  /** List of contract addresses the session key can interact with (empty = any) */
  contractWhitelist: `0x${string}`[];
  /** Allowed method names (e.g., 'swap', 'transfer') - optional */
  allowedMethods?: string[];
  /** Unix timestamp when the session key expires */
  validUntil: number;
}

/**
 * Date value that can be either a Date object or ISO string (from JSON serialization)
 */
export type DateOrString = Date | string;

/**
 * Parse a DateOrString into a Date object
 * Handles both Date objects and ISO string representations
 */
export function parseDate(value: DateOrString | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Session key record as stored in the database
 * Note: Date fields may be strings when received from JSON APIs
 */
export interface SessionKeyRecord {
  id: string;
  userId: string;
  walletAddress: string;
  chainId: number;
  sessionPublicKey: string;
  encryptedSessionPrivateKey: string;
  permissions: SessionKeyPermissions;
  grantedAt: DateOrString;
  expiresAt: DateOrString;
  revokedAt: DateOrString | null;
  grantedBy: "user" | "system";
  revocationReason: string | null;
  metadata: Record<string, UntypedJson>;
}

/**
 * Input for granting a new session key
 */
export interface GrantSessionKeyInput {
  walletAddress: `0x${string}`;
  chainId: number;
  sessionPublicKey: `0x${string}`;
  encryptedSessionPrivateKey: string;
  permissions: SessionKeyPermissions;
  expiresAt: Date;
  metadata?: Record<string, UntypedJson>;
}

/**
 * Result of a session key grant operation
 */
export interface GrantSessionKeyResult {
  success: boolean;
  sessionKeyId?: string;
  error?: string;
}

/**
 * Input for revoking a session key
 */
export interface RevokeSessionKeyInput {
  sessionKeyId: string;
  reason?: string;
}

/**
 * Result of a session key revocation
 */
export interface RevokeSessionKeyResult {
  success: boolean;
  error?: string;
}

/**
 * Active session key for agent operations
 */
export interface ActiveSessionKey {
  id: string;
  sessionPublicKey: `0x${string}`;
  encryptedSessionPrivateKey: string;
  permissions: SessionKeyPermissions;
  expiresAt: Date;
}

/**
 * Operation to be validated against session key permissions
 */
export interface SessionKeyOperation {
  to: `0x${string}`;
  value: bigint;
  data?: `0x${string}`;
  method?: string;
}

/**
 * Result of session key permission validation
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Session key audit event types
 */
export type SessionKeyEventType =
  | "granted"
  | "used"
  | "revoked"
  | "expired"
  | "permission_denied";

/**
 * Session key audit entry
 */
export interface SessionKeyAuditEntry {
  id: string;
  sessionKeyId: string;
  eventType: SessionKeyEventType;
  eventTimestamp: Date;
  operationType?: string;
  operationValue?: string;
  operationTo?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, UntypedJson>;
}
