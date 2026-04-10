/**
 * Audit Log
 * 
 * Domain: server, logging
 * Responsibility: Records audit events for wallet operations and tool invocations.
 * Depends on: Redis for persistent storage
 */

import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
type WalletExportEvent = {
  userId: string;
  address: string;
};

type ToolInvocationEvent = {
  tool: string;
  arguments: Record<string, UntypedJson>;
  userId?: string;
  address?: string;
  resultHash?: string;
};

export async function recordWalletExportAudit(event: WalletExportEvent) {
  const payload = {
    ...event,
    recordedAt: new Date().toISOString(),
  };

  if (!isRedisConfigured) {
    logger.warn("wallet_export_audit", payload);
    return;
  }

  const key = `audit:wallet_export:${payload.recordedAt}:${payload.userId}`;
  try {
    await redis.set(key, payload, { ex: 60 * 60 * 24 * 30 });
  } catch (error) {
    logger.error("wallet_export_audit_failed", error);
  }
}

/**
 * Records a tool invocation audit event.
 */
export async function recordToolInvocationAudit(
  event: ToolInvocationEvent,
  prefix = "tool"
) {
  const payload = {
    ...event,
    recordedAt: new Date().toISOString(),
  };

  if (!isRedisConfigured) {
    logger.info(`${prefix}_audit`, payload);
    return;
  }

  const key = `audit:${prefix}:${payload.recordedAt}:${payload.tool}`;
  try {
    await redis.set(key, payload, { ex: 60 * 60 * 24 * 7 });
  } catch (error) {
    logger.error(`${prefix}_audit_failed`, error);
  }
}

// Audit helpers are provider-agnostic.
