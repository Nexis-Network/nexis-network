/**
 * Superagent Guardrails - Middleware Functions
 * Domain: security
 * Responsibility: Reusable middleware for request/response pipelines
 * Depends on: guard, verify, redact, config, types
 */

import { guardPrompt, guardTool, guardFile } from "./guard";
import { verifyModelOutput, verifyToolOutput, sanitizeOutput } from "./verify";
import { redactUserInput, redactToolOutput, redactTelemetry } from "./redact";
import {
  isSuperagentEnabled,
  isToolGuardEnabled,
  isFileScanEnabled,
  isOutputVerifyEnabled,
  isRedactEnabled,
} from "./config";
import type {
  GuardResult,
  VerifyResult,
  SecurityEvent,
  SecurityEventType,
  GuardViolation,
  SeverityLevel,
} from "./types";
import { SecurityViolationError } from "./types";
import { nanoid } from "nanoid";

// ============================================================================
// Security Event Emitter Type
// ============================================================================

export type SecurityEventEmitter = (event: SecurityEvent) => void;

let globalEventEmitter: SecurityEventEmitter | null = null;

export const setSecurityEventEmitter = (emitter: SecurityEventEmitter): void => {
  globalEventEmitter = emitter;
};

const emitSecurityEvent = (
  type: SecurityEventType,
  options: {
    action: SecurityEvent["action"];
    severity: SeverityLevel;
    violations?: GuardViolation[];
    userId?: string | null;
    sessionId?: string | null;
    toolName?: string;
    requestId?: string;
    reasoning?: string;
    metadata?: Record<string, UntypedJson>;
  },
): SecurityEvent => {
  const event: SecurityEvent = {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    type,
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

  if (globalEventEmitter) {
    globalEventEmitter(event);
  }

  return event;
};

// ============================================================================
// Prompt Guard Middleware
// ============================================================================

export type PromptGuardMiddlewareOptions = {
  userId?: string | null;
  sessionId?: string | null;
  attachmentContext?: string | null;
  onViolation?: (result: GuardResult, event: SecurityEvent) => void;
};

/**
 * Middleware that guards user prompts before processing.
 * Returns the original prompt if safe, throws if blocked in enforce mode.
 */
export const withPromptGuard = async (
  userMessage: string,
  options: PromptGuardMiddlewareOptions = {},
): Promise<{ safe: boolean; message: string; result: GuardResult }> => {
  if (!isSuperagentEnabled()) {
    return { safe: true, message: userMessage, result: { blocked: false, violations: [] } };
  }

  const result = await guardPrompt(userMessage, {
    userId: options.userId,
    sessionId: options.sessionId,
    attachmentContext: options.attachmentContext,
  });

  if (result.violations.length > 0) {
    const event = emitSecurityEvent(
      result.blocked ? "prompt_blocked" : "guard_violation",
      {
        action: result.blocked ? "blocked" : "warned",
        severity: result.violations[0]?.severity ?? "medium",
        violations: result.violations,
        userId: options.userId,
        sessionId: options.sessionId,
        requestId: result.requestId,
        reasoning: result.reasoning,
      },
    );

    if (options.onViolation) {
      options.onViolation(result, event);
    }

    if (result.blocked) {
      throw new SecurityViolationError(result);
    }
  }

  return { safe: !result.blocked, message: userMessage, result };
};

// ============================================================================
// Tool Guard Middleware
// ============================================================================

export type ToolGuardMiddlewareOptions = {
  userId?: string | null;
  sessionId?: string | null;
  onViolation?: (toolName: string, result: GuardResult, event: SecurityEvent) => void;
};

/**
 * Middleware that guards tool executions.
 * Returns true if tool can proceed, false or throws if blocked.
 */
export const withToolGuard = async (
  toolName: string,
  input: UntypedJson,
  options: ToolGuardMiddlewareOptions = {},
): Promise<{ safe: boolean; result: GuardResult }> => {
  if (!isSuperagentEnabled() || !isToolGuardEnabled()) {
    return { safe: true, result: { blocked: false, violations: [] } };
  }

  const result = await guardTool(toolName, input, {
    userId: options.userId,
    sessionId: options.sessionId,
  });

  if (result.violations.length > 0) {
    const event = emitSecurityEvent(
      result.blocked ? "tool_blocked" : "guard_violation",
      {
        action: result.blocked ? "blocked" : "warned",
        severity: result.violations[0]?.severity ?? "medium",
        violations: result.violations,
        userId: options.userId,
        sessionId: options.sessionId,
        toolName,
        requestId: result.requestId,
        reasoning: result.reasoning,
      },
    );

    if (options.onViolation) {
      options.onViolation(toolName, result, event);
    }

    if (result.blocked) {
      throw new SecurityViolationError(result);
    }
  }

  return { safe: !result.blocked, result };
};

// ============================================================================
// File Scan Middleware
// ============================================================================

export type FileScanMiddlewareOptions = {
  userId?: string | null;
  onViolation?: (filename: string, result: GuardResult, event: SecurityEvent) => void;
};

/**
 * Middleware that scans file uploads for malicious content.
 */
export const withFileScan = async (
  fileContent: string,
  filename: string,
  mimeType: string,
  options: FileScanMiddlewareOptions = {},
): Promise<{ safe: boolean; result: GuardResult }> => {
  if (!isSuperagentEnabled() || !isFileScanEnabled()) {
    return { safe: true, result: { blocked: false, violations: [] } };
  }

  const result = await guardFile(fileContent, filename, mimeType, {
    userId: options.userId,
  });

  if (result.violations.length > 0) {
    const event = emitSecurityEvent(
      result.blocked ? "file_rejected" : "guard_violation",
      {
        action: result.blocked ? "blocked" : "warned",
        severity: result.violations[0]?.severity ?? "medium",
        violations: result.violations,
        userId: options.userId,
        requestId: result.requestId,
        reasoning: result.reasoning,
        metadata: { filename, mimeType },
      },
    );

    if (options.onViolation) {
      options.onViolation(filename, result, event);
    }

    if (result.blocked) {
      throw new SecurityViolationError(result);
    }
  }

  return { safe: !result.blocked, result };
};

// ============================================================================
// Output Verify Middleware
// ============================================================================

export type OutputVerifyMiddlewareOptions = {
  userId?: string | null;
  sessionId?: string | null;
  toolCalls?: UntypedJson[];
  sanitize?: boolean;
  onFlagged?: (result: VerifyResult, event: SecurityEvent) => void;
};

/**
 * Middleware that verifies model outputs and optionally sanitizes them.
 */
export const withOutputVerify = async (
  output: string,
  options: OutputVerifyMiddlewareOptions = {},
): Promise<{ verified: boolean; output: string; result: VerifyResult }> => {
  if (!isSuperagentEnabled() || !isOutputVerifyEnabled()) {
    return { verified: true, output, result: { flagged: false, violations: [] } };
  }

  const result = await verifyModelOutput(output, {
    userId: options.userId,
    sessionId: options.sessionId,
    toolCalls: options.toolCalls,
  });

  let finalOutput = output;

  if (result.flagged) {
    const event = emitSecurityEvent("verify_flagged", {
      action: options.sanitize ? "redacted" : "warned",
      severity: result.violations[0]?.severity ?? "medium",
      violations: result.violations,
      userId: options.userId,
      sessionId: options.sessionId,
      requestId: result.requestId,
      reasoning: result.reasoning,
    });

    if (options.onFlagged) {
      options.onFlagged(result, event);
    }

    if (options.sanitize !== false) {
      finalOutput = sanitizeOutput(output, result);
      
      if (finalOutput !== output) {
        emitSecurityEvent("output_sanitized", {
          action: "redacted",
          severity: result.violations[0]?.severity ?? "medium",
          violations: result.violations,
          userId: options.userId,
          sessionId: options.sessionId,
        });
      }
    }
  }

  return { verified: !result.flagged, output: finalOutput, result };
};

// ============================================================================
// Tool Output Verify Middleware
// ============================================================================

export type ToolOutputVerifyMiddlewareOptions = {
  userId?: string | null;
  sessionId?: string | null;
  toolInput?: UntypedJson;
  redactSensitive?: boolean;
};

/**
 * Middleware that verifies and optionally redacts tool outputs.
 */
export const withToolOutputVerify = async (
  toolName: string,
  output: UntypedJson,
  options: ToolOutputVerifyMiddlewareOptions = {},
): Promise<{ verified: boolean; output: UntypedJson; result: VerifyResult }> => {
  if (!isSuperagentEnabled() || !isOutputVerifyEnabled()) {
    return { verified: true, output, result: { flagged: false, violations: [] } };
  }

  const result = await verifyToolOutput(toolName, output, {
    userId: options.userId,
    sessionId: options.sessionId,
    toolInput: options.toolInput,
  });

  let finalOutput = output;

  if (result.flagged && options.redactSensitive !== false) {
    const redacted = await redactToolOutput(output, toolName);
    finalOutput = redacted.redacted;

    if (redacted.redactionCount > 0) {
      emitSecurityEvent("redaction_applied", {
        action: "redacted",
        severity: result.violations[0]?.severity ?? "medium",
        violations: result.violations,
        userId: options.userId,
        sessionId: options.sessionId,
        toolName,
        metadata: { redactionCount: redacted.redactionCount },
      });
    }
  }

  return { verified: !result.flagged, output: finalOutput, result };
};

// ============================================================================
// Redaction Middleware
// ============================================================================

export type RedactMiddlewareOptions = {
  userId?: string | null;
  source?: string;
};

/**
 * Middleware that redacts sensitive data from user input.
 */
export const withInputRedaction = async (
  input: string,
  options: RedactMiddlewareOptions = {},
): Promise<{ redacted: string; redactionCount: number }> => {
  if (!isSuperagentEnabled() || !isRedactEnabled()) {
    return { redacted: input, redactionCount: 0 };
  }

  const result = await redactUserInput(input, { userId: options.userId });

  if (result.redactionCount > 0) {
    emitSecurityEvent("redaction_applied", {
      action: "redacted",
      severity: "info",
      userId: options.userId,
      metadata: {
        source: options.source ?? "user_input",
        redactionCount: result.redactionCount,
      },
    });
  }

  return { redacted: result.redacted, redactionCount: result.redactionCount };
};

/**
 * Middleware that redacts telemetry before external transmission.
 */
export const withTelemetryRedaction = async (
  metadata: Record<string, UntypedJson>,
): Promise<Record<string, UntypedJson>> => {
  if (!isSuperagentEnabled() || !isRedactEnabled()) {
    return metadata;
  }

  const result = await redactTelemetry(metadata);
  return result.redacted;
};

// ============================================================================
// Combined Security Middleware
// ============================================================================

export type FullSecurityMiddlewareOptions = {
  userId?: string | null;
  sessionId?: string | null;
  attachmentContext?: string | null;
  onSecurityEvent?: (event: SecurityEvent) => void;
};

/**
 * Combined middleware that applies all security checks to a user message.
 */
export const withFullSecurity = async (
  userMessage: string,
  options: FullSecurityMiddlewareOptions = {},
): Promise<{
  safe: boolean;
  processedMessage: string;
  guardResult: GuardResult;
  redactionCount: number;
}> => {
  // Set up event handler if provided
  if (options.onSecurityEvent) {
    setSecurityEventEmitter(options.onSecurityEvent);
  }

  // Step 1: Guard the prompt
  const guardCheckResult = await withPromptGuard(userMessage, {
    userId: options.userId,
    sessionId: options.sessionId,
    attachmentContext: options.attachmentContext,
  });

  // Step 2: Redact sensitive data for logging (not from actual message)
  const redactionResult = await withInputRedaction(userMessage, {
    userId: options.userId,
    source: "full_security_check",
  });

  return {
    safe: guardCheckResult.safe,
    processedMessage: userMessage, // Original message (redaction is for logging)
    guardResult: guardCheckResult.result,
    redactionCount: redactionResult.redactionCount,
  };
};

