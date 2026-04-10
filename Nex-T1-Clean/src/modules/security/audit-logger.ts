/**
 * Security Audit Logger
 * Domain: security
 * Responsibility: Structured security event logging with CWE codes and SIEM support
 * Depends on: @/server/services/superagent/types, @/server/services/redis
 */

import { nanoid } from "nanoid";
import type {
  SecurityEvent,
  SecurityEventType,
  GuardViolation,
  SeverityLevel,
} from "@/server/services/superagent/types";
import { redis, isRedisConfigured } from "@/server/services/redis";

// ============================================================================
// Configuration
// ============================================================================

const SECURITY_LOG_PREFIX = "security:audit";
const SECURITY_LOG_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_PARALLEL_FETCHES = 50; // Limit concurrent Redis fetches
const SIEM_WEBHOOK_URL = process.env.SECURITY_SIEM_WEBHOOK_URL;
const SIEM_ENABLED = process.env.SECURITY_SIEM_ENABLED === "true";

// ============================================================================
// Validation Helpers
// ============================================================================

const SAFE_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates and sanitizes a string for use in Redis keys.
 * Prevents key injection attacks.
 */
const sanitizeKeyComponent = (value: string): string | null => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!SAFE_KEY_PATTERN.test(trimmed)) return null;
  return trimmed;
};

// ============================================================================
// Event Creation
// ============================================================================

export type CreateSecurityEventOptions = {
  type: SecurityEventType;
  action: SecurityEvent["action"];
  severity: SeverityLevel;
  violations?: GuardViolation[];
  userId?: string | null;
  sessionId?: string | null;
  toolName?: string;
  requestId?: string;
  reasoning?: string;
  metadata?: Record<string, UntypedJson>;
};

export const createSecurityEvent = (
  options: CreateSecurityEventOptions,
): SecurityEvent => {
  return {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    type: options.type,
    action: options.action,
    severity: options.severity,
    cweCode: options.violations?.[0]?.cweCode,
    violationType: options.violations?.[0]?.type,
    userId: options.userId ?? undefined,
    sessionId: options.sessionId ?? undefined,
    toolName: options.toolName,
    requestId: options.requestId,
    reasoning: options.reasoning,
    metadata: options.metadata,
  };
};

// ============================================================================
// Logging
// ============================================================================

/**
 * Logs a security event to console (structured JSON for log aggregators).
 */
export const logSecurityEvent = (event: SecurityEvent): void => {
  const logLevel = getLogLevel(event.severity);
  const logEntry = {
    level: logLevel,
    category: "security",
    event: event.type,
    ...event,
  };

  if (logLevel === "error") {
    logger.error("[SECURITY]", JSON.stringify(logEntry));
  } else if (logLevel === "warn") {
    logger.warn("[SECURITY]", JSON.stringify(logEntry));
  } else {
    logger.debug("[SECURITY]", JSON.stringify(logEntry));
  }
};

const getLogLevel = (severity: SeverityLevel): "error" | "warn" | "info" => {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warn";
    default:
      return "info";
  }
};

// ============================================================================
// Redis Persistence
// ============================================================================

/**
 * Persists a security event to Redis for audit trail.
 * Uses sets instead of lists for simpler Redis interface compatibility.
 */
export const persistSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  if (!isRedisConfigured) {
    return;
  }

  // Validate event ID
  const sanitizedEventId = sanitizeKeyComponent(event.id);
  if (!sanitizedEventId) {
    logger.error("[SecurityAudit] Invalid event ID, skipping persistence");
    return;
  }

  try {
    const key = `${SECURITY_LOG_PREFIX}:${sanitizedEventId}`;
    await redis.setex(key, SECURITY_LOG_TTL_SECONDS, JSON.stringify(event));

    // Also add to user-specific set if userId is present and valid
    if (event.userId) {
      const sanitizedUserId = sanitizeKeyComponent(event.userId);
      if (sanitizedUserId) {
        const userKey = `${SECURITY_LOG_PREFIX}:user:${sanitizedUserId}`;
        await redis.sadd(userKey, sanitizedEventId);
        if (redis.expire) {
          await redis.expire(userKey, SECURITY_LOG_TTL_SECONDS);
        }
      }
    }

    // Add to severity-based indexes for quick queries
    const severityKey = `${SECURITY_LOG_PREFIX}:severity:${event.severity}`;
    await redis.sadd(severityKey, sanitizedEventId);
    if (redis.expire) {
      await redis.expire(severityKey, SECURITY_LOG_TTL_SECONDS);
    }
  } catch (error) {
    logger.error("[SecurityAudit] Failed to persist event:", error);
  }
};

/**
 * Retrieves a security event by ID.
 */
export const getSecurityEvent = async (eventId: string): Promise<SecurityEvent | null> => {
  if (!isRedisConfigured) {
    return null;
  }

  try {
    const key = `${SECURITY_LOG_PREFIX}:${eventId}`;
    const data = await redis.get<string>(key);
    return data ? (JSON.parse(data) as SecurityEvent) : null;
  } catch (error) {
    logger.error("[SecurityAudit] Failed to retrieve event:", error);
    return null;
  }
};

/**
 * Retrieves security events for a user.
 * Uses parallel fetching for better performance.
 */
export const getUserSecurityEvents = async (
  userId: string,
  limit = 50,
): Promise<SecurityEvent[]> => {
  if (!isRedisConfigured) {
    return [];
  }

  // Validate userId to prevent key injection
  const sanitizedUserId = sanitizeKeyComponent(userId);
  if (!sanitizedUserId) {
    logger.warn("[SecurityAudit] Invalid userId provided");
    return [];
  }

  try {
    const userKey = `${SECURITY_LOG_PREFIX}:user:${sanitizedUserId}`;
    const eventIds = await redis.smembers(userKey);

    // Limit the number of IDs to fetch
    const idsToFetch = eventIds.slice(0, Math.min(limit, MAX_PARALLEL_FETCHES));
    
    // Fetch events in parallel for better performance
    const eventPromises = idsToFetch.map((eventId) => getSecurityEvent(eventId));
    const results = await Promise.all(eventPromises);
    
    // Filter out null results
    const events = results.filter((event): event is SecurityEvent => event !== null);

    // Sort by timestamp descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  } catch (error) {
    logger.error("[SecurityAudit] Failed to retrieve user events:", error);
    return [];
  }
};

/**
 * Retrieves security events by severity.
 * Uses parallel fetching for better performance.
 */
export const getSecurityEventsBySeverity = async (
  severity: SeverityLevel,
  limit = 50,
): Promise<SecurityEvent[]> => {
  if (!isRedisConfigured) {
    return [];
  }

  try {
    const severityKey = `${SECURITY_LOG_PREFIX}:severity:${severity}`;
    const eventIds = await redis.smembers(severityKey);

    // Limit the number of IDs to fetch
    const idsToFetch = eventIds.slice(0, Math.min(limit, MAX_PARALLEL_FETCHES));
    
    // Fetch events in parallel for better performance
    const eventPromises = idsToFetch.map((eventId) => getSecurityEvent(eventId));
    const results = await Promise.all(eventPromises);
    
    // Filter out null results
    const events = results.filter((event): event is SecurityEvent => event !== null);

    // Sort by timestamp descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  } catch (error) {
    logger.error("[SecurityAudit] Failed to retrieve severity events:", error);
    return [];
  }
};

// ============================================================================
// SIEM Integration
// ============================================================================

/**
 * Sends security event to SIEM webhook.
 */
export const sendToSIEM = async (event: SecurityEvent): Promise<void> => {
  if (!SIEM_ENABLED || !SIEM_WEBHOOK_URL) {
    return;
  }

  try {
    const response = await fetch(SIEM_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event-Type": event.type,
        "X-Severity": event.severity,
      },
      body: JSON.stringify({
        source: "nex-t1-guardrails",
        event,
        timestamp: event.timestamp,
      }),
    });

    if (!response.ok) {
      logger.error(`[SecurityAudit] SIEM webhook failed: ${response.status}`);
    }
  } catch (error) {
    logger.error("[SecurityAudit] SIEM webhook error:", error);
  }
};

// ============================================================================
// Combined Audit Function
// ============================================================================

/**
 * Full audit: logs, persists, and sends to SIEM.
 */
export const auditSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  // Always log to console
  logSecurityEvent(event);

  // Persist to Redis (async, non-blocking)
  persistSecurityEvent(event).catch((error) => {
    logger.error("[SecurityAudit] Persistence failed:", error);
  });

  // Send to SIEM for critical/high severity
  if (event.severity === "critical" || event.severity === "high") {
    sendToSIEM(event).catch((error) => {
      logger.error("[SecurityAudit] SIEM send failed:", error);
    });
  }
};

/**
 * Creates and audits a security event in one call.
 */
export const recordSecurityEvent = async (
  options: CreateSecurityEventOptions,
): Promise<SecurityEvent> => {
  const event = createSecurityEvent(options);
  await auditSecurityEvent(event);
  return event;
};

// ============================================================================
// Analytics Helpers
// ============================================================================

export type SecuritySummary = {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<SeverityLevel, number>;
  byAction: Record<string, number>;
};

/**
 * Gets security event summary for a user.
 */
export const getUserSecuritySummary = async (userId: string): Promise<SecuritySummary> => {
  const events = await getUserSecurityEvents(userId, 100);

  const summary: SecuritySummary = {
    total: events.length,
    byType: {},
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
    byAction: {},
  };

  for (const event of events) {
    summary.byType[event.type] = (summary.byType[event.type] ?? 0) + 1;
    summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] ?? 0) + 1;
    summary.byAction[event.action] = (summary.byAction[event.action] ?? 0) + 1;
  }

  return summary;
};

// ============================================================================
// Security Event Emitter for Middleware
// ============================================================================

import { setSecurityEventEmitter } from "@/server/services/superagent/middleware";


import { logger } from '@/lib/logger';
/**
 * Initializes the security event emitter to use the audit logger.
 */
export const initializeSecurityAudit = (): void => {
  setSecurityEventEmitter((event) => {
    auditSecurityEvent(event).catch((error) => {
      logger.error("[SecurityAudit] Event handling failed:", error);
    });
  });
};

// Auto-initialize when module is imported
initializeSecurityAudit();

