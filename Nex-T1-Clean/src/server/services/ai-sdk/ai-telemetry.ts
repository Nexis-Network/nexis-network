// Domain: ai-sdk
// Responsibility: Deterministic telemetry hooks for AI executions.
import { createHash } from "node:crypto";

import { aiLogger } from "@/server/logging/logger";

export type TelemetryEvent = {
  model: string;
  tools: string[];
  orgId?: string | null;
  userId?: string | null;
  latencyMs?: number;
  success: boolean;
  error?: string;
  errorCode?: string | null;
  traceId?: string | null;
  conversationId?: string | null;
  toolCallId?: string | null;
  approvalId?: string | null;
  idempotencyKey?: string | null;
  riskClass?: string | null;
  toolCategory?: string | null;
  modelRoute?: string | null;
};

function hashIdentifier(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function normalizeErrorCode(error: string | null | undefined): string | null {
  const normalized = error?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const safeCode = normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return safeCode.length > 0 ? safeCode : "unknown_error";
}

export function recordAiTelemetry(event: TelemetryEvent): void {
  aiLogger.info({
    event: "ai_telemetry",
    model: event.model,
    modelRoute: event.modelRoute ?? null,
    tools: event.tools,
    toolCount: event.tools.length,
    orgHash: hashIdentifier(event.orgId) ?? "none",
    userHash: hashIdentifier(event.userId) ?? "none",
    traceId: event.traceId ?? null,
    conversationId: event.conversationId ?? null,
    toolCallId: event.toolCallId ?? null,
    approvalId: event.approvalId ?? null,
    idempotencyKey: event.idempotencyKey ?? null,
    riskClass: event.riskClass ?? null,
    toolCategory: event.toolCategory ?? null,
    latencyMs: event.latencyMs ?? null,
    success: event.success,
    errorCode: event.errorCode ?? normalizeErrorCode(event.error) ?? null,
  });
}
