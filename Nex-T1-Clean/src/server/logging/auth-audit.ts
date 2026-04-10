/**
 * Auth Audit Logger
 * 
 * Structured audit logging for authentication events.
 * Designed for security monitoring, compliance, and incident response.
 */

import { authLogger } from "@/server/logging/logger";

/**
 * Auth event categories for filtering and alerting.
 */
export type AuthEventCategory = 
  | "authentication"
  | "session"
  | "mfa"
  | "password"
  | "oauth"
  | "wallet"
  | "security";

/**
 * Auth event severity levels.
 */
export type AuthEventSeverity = "info" | "warn" | "critical";

/**
 * Base context for all auth audit events.
 */
export type AuthAuditContext = {
  /** Unique identifier for the user */
  userId?: string | null;
  /** Email address (may be partial for privacy) */
  email?: string | null;
  /** IP address of the client */
  clientIp?: string | null;
  /** User agent string */
  userAgent?: string | null;
  /** Correlation ID for request tracing */
  correlationId?: string | null;
  /** Session ID if available */
  sessionId?: string | null;
  /** Additional metadata */
  metadata?: Record<string, UntypedJson>;
};

/**
 * Auth audit event payload.
 */
export type AuthAuditEvent = AuthAuditContext & {
  /** Event name (snake_case) */
  event: string;
  /** Event category */
  category: AuthEventCategory;
  /** Event severity */
  severity: AuthEventSeverity;
  /** Human-readable description */
  description?: string;
  /** Whether the action succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Provider (for OAuth/wallet events) */
  provider?: string;
};

/**
 * Mask sensitive data for logging.
 */
function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const maskedLocal = local.length > 2 
    ? `${local[0]}***${local[local.length - 1]}`
    : "***";
  return `${maskedLocal}@${domain}`;
}

function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // IPv4: mask last octet
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  // IPv6: mask last 4 segments
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(":") + ":***";
    }
  }
  return ip.slice(0, 8) + "***";
}

/**
 * Log an auth audit event.
 */
export function logAuthAudit(event: AuthAuditEvent): void {
  const payload = {
    event: event.event,
    category: event.category,
    severity: event.severity,
    success: event.success,
    userId: event.userId ?? undefined,
    email: event.email ? maskEmail(event.email) : undefined,
    clientIp: event.clientIp ? maskIp(event.clientIp) : undefined,
    sessionId: event.sessionId ?? undefined,
    correlationId: event.correlationId ?? undefined,
    provider: event.provider ?? undefined,
    error: event.error ?? undefined,
    description: event.description ?? undefined,
    ...event.metadata,
  };

  switch (event.severity) {
    case "critical":
      authLogger.error(payload, event.description ?? event.event);
      break;
    case "warn":
      authLogger.warn(payload, event.description ?? event.event);
      break;
    default:
      authLogger.info(payload, event.description ?? event.event);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-defined audit event helpers
// ─────────────────────────────────────────────────────────────────────────────

export const AuthAudit = {
  /**
   * Log a successful sign-in.
   */
  signInSuccess(context: AuthAuditContext & { provider?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_signin_success",
      category: "authentication",
      severity: "info",
      success: true,
      description: `User signed in via ${context.provider ?? "password"}`,
    });
  },

  /**
   * Log a failed sign-in attempt.
   */
  signInFailed(context: AuthAuditContext & { provider?: string; reason?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_signin_failed",
      category: "authentication",
      severity: "warn",
      success: false,
      error: context.reason,
      description: `Sign-in failed via ${context.provider ?? "password"}`,
    });
  },

  /**
   * Log a sign-out event.
   */
  signOut(context: AuthAuditContext & { scope?: "local" | "global" }): void {
    logAuthAudit({
      ...context,
      event: "auth_signout",
      category: "session",
      severity: "info",
      success: true,
      description: `User signed out (${context.scope ?? "local"})`,
    });
  },

  /**
   * Log a session revocation event.
   */
  sessionRevoked(context: AuthAuditContext & { 
    revokedSessionId?: string;
    revokedCount?: number;
    scope?: "single" | "all" | "others";
    reason?: string;
  }): void {
    logAuthAudit({
      ...context,
      event: "auth_session_revoked",
      category: "session",
      severity: context.scope === "all" ? "warn" : "info",
      success: true,
      description: `Sessions revoked (${context.scope ?? "single"}: ${context.revokedCount ?? 1})`,
      metadata: {
        revokedSessionId: context.revokedSessionId,
        revokedCount: context.revokedCount,
        scope: context.scope,
        reason: context.reason,
      },
    });
  },

  /**
   * Log MFA challenge sent.
   */
  mfaChallengeSent(context: AuthAuditContext & { factorType?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_mfa_challenge_sent",
      category: "mfa",
      severity: "info",
      success: true,
      description: `MFA challenge sent (${context.factorType ?? "totp"})`,
    });
  },

  /**
   * Log MFA verification success.
   */
  mfaVerifySuccess(context: AuthAuditContext & { factorType?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_mfa_verify_success",
      category: "mfa",
      severity: "info",
      success: true,
      description: `MFA verification successful (${context.factorType ?? "totp"})`,
    });
  },

  /**
   * Log MFA verification failure.
   */
  mfaVerifyFailed(context: AuthAuditContext & { factorType?: string; attempts?: number }): void {
    logAuthAudit({
      ...context,
      event: "auth_mfa_verify_failed",
      category: "mfa",
      severity: "warn",
      success: false,
      description: `MFA verification failed (${context.factorType ?? "totp"})`,
      metadata: { attempts: context.attempts },
    });
  },

  /**
   * Log password reset request.
   */
  passwordResetRequested(context: AuthAuditContext): void {
    logAuthAudit({
      ...context,
      event: "auth_password_reset_requested",
      category: "password",
      severity: "info",
      success: true,
      description: "Password reset requested",
    });
  },

  /**
   * Log password change.
   */
  passwordChanged(context: AuthAuditContext): void {
    logAuthAudit({
      ...context,
      event: "auth_password_changed",
      category: "password",
      severity: "info",
      success: true,
      description: "Password changed successfully",
    });
  },

  /**
   * Log suspicious activity detection.
   */
  suspiciousActivity(context: AuthAuditContext & { 
    activityType: string;
    details?: string;
  }): void {
    logAuthAudit({
      ...context,
      event: "auth_suspicious_activity",
      category: "security",
      severity: "critical",
      success: false,
      description: `Suspicious activity: ${context.activityType}`,
      error: context.details,
    });
  },

  /**
   * Log rate limit exceeded.
   */
  rateLimitExceeded(context: AuthAuditContext & { endpoint?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_rate_limit_exceeded",
      category: "security",
      severity: "warn",
      success: false,
      description: `Rate limit exceeded on ${context.endpoint ?? "auth"}`,
    });
  },

  /**
   * Log wallet authentication success.
   */
  walletAuthSuccess(context: AuthAuditContext & { 
    chain?: string;
    walletAddress?: string;
  }): void {
    logAuthAudit({
      ...context,
      event: "auth_wallet_success",
      category: "wallet",
      severity: "info",
      success: true,
      provider: `wallet:${context.chain ?? "unknown"}`,
      description: `Wallet authentication successful (${context.chain ?? "unknown"})`,
      metadata: {
        walletAddress: context.walletAddress?.slice(0, 10) + "...",
      },
    });
  },

  /**
   * Log wallet authentication failure.
   */
  walletAuthFailed(context: AuthAuditContext & { 
    chain?: string;
    reason?: string;
  }): void {
    logAuthAudit({
      ...context,
      event: "auth_wallet_failed",
      category: "wallet",
      severity: "warn",
      success: false,
      provider: `wallet:${context.chain ?? "unknown"}`,
      error: context.reason,
      description: `Wallet authentication failed (${context.chain ?? "unknown"})`,
    });
  },

  /**
   * Log OAuth callback success.
   */
  oauthSuccess(context: AuthAuditContext & { provider: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_oauth_success",
      category: "oauth",
      severity: "info",
      success: true,
      description: `OAuth authentication successful (${context.provider})`,
    });
  },

  /**
   * Log OAuth callback failure.
   */
  oauthFailed(context: AuthAuditContext & { provider: string; reason?: string }): void {
    logAuthAudit({
      ...context,
      event: "auth_oauth_failed",
      category: "oauth",
      severity: "warn",
      success: false,
      error: context.reason,
      description: `OAuth authentication failed (${context.provider})`,
    });
  },
};

export default AuthAudit;

