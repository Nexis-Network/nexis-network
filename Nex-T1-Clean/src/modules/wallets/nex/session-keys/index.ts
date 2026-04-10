/**
 * Session Keys Module
 * ERC-4337 session key delegation for AI agent operations
 */

// Types
export type {
  SessionKeyPermissions,
  SessionKeyRecord,
  GrantSessionKeyInput,
  GrantSessionKeyResult,
  RevokeSessionKeyInput,
  RevokeSessionKeyResult,
  ActiveSessionKey,
  SessionKeyOperation,
  ValidationResult,
  SessionKeyEventType,
  SessionKeyAuditEntry,
  DateOrString,
} from "./types";

// Utilities
export { parseDate } from "./types";

// Client-side operations (grant, revoke)
export {
  generateSessionKeypair,
  encryptSessionKeyForServer,
  grantAgentSessionKey,
  createDefaultPermissions,
  DEFAULT_SESSION_KEY_EXPIRY_MS,
  MAX_SESSION_KEY_EXPIRY_MS,
} from "./grant";

export {
  revokeSessionKey,
  revokeAllSessionKeys,
  listSessionKeys,
  getSessionKeyDetails,
} from "./revoke";

// Validation
export {
  validateSessionKeyOperation,
  isSessionKeyActive,
  getSessionKeyRemainingTime,
  parsePermissions,
  serializePermissions,
} from "./validate";

// Server-only agent operations live in ./server to avoid bundling `next/headers` into client code.
// Import from "@/modules/wallets/nex/session-keys/server" when running on the server.
