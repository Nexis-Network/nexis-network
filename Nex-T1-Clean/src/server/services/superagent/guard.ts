/**
 * Superagent Guardrails - Guard Functions
 * Domain: security
 * Responsibility: Input validation and prompt injection detection
 * Depends on: client, config, types
 */

import { guard as guardRequest } from "./client";
import {
  isSuperagentEnabled,
  isEnforceMode,
  shouldBlock,
  isToolAllowed,
  isHighRiskTool,
  detectPromptLeakAttempt,
  detectToolOutputInjection,
} from "./config";
import type {
  GuardRequest,
  GuardResult,
  GuardViolation,
  SeverityLevel,
} from "./types";
import { SecurityViolationError } from "./types";

// ============================================================================
// Guard User Prompts
// ============================================================================

export type GuardPromptOptions = {
  userId?: string | null;
  sessionId?: string | null;
  attachmentContext?: string | null;
};

/**
 * Guards user prompts before they reach the AI model.
 * Combines remote API checks with local pattern detection for defense-in-depth.
 */
export const guardPrompt = async (
  userMessage: string,
  options: GuardPromptOptions = {},
): Promise<GuardResult> => {
  if (!isSuperagentEnabled()) {
    return { blocked: false, violations: [] };
  }

  // Local prompt leak / jailbreak detection (fast, no API call)
  const leakAttempt = detectPromptLeakAttempt(userMessage);
  if (leakAttempt) {
    const violation: GuardViolation = {
      id: `local-prompt-leak-${Date.now()}`,
      type: "jailbreak_attempt",
      cweCode: "CWE-200",
      severity: "high",
      message: `Prompt leak/jailbreak attempt detected: ${leakAttempt}`,
      confidence: 0.85,
    };

    const localResult: GuardResult = {
      blocked: isEnforceMode(),
      violations: [violation],
      reasoning: `Local detection: ${leakAttempt}`,
    };

    if (!isEnforceMode()) {
      localResult.blocked = false;
      localResult.reasoning = `[MONITOR MODE] Would have blocked: ${localResult.reasoning}`;
    }

    return localResult;
  }

  // Remote API check (if available)
  const request: GuardRequest = {
    input: userMessage,
    action: "user_prompt",
    attachments: options.attachmentContext ?? undefined,
    metadata: {
      userId: options.userId,
      sessionId: options.sessionId,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await guardRequest(request);

  // In monitor mode, never block but still return violations
  if (!isEnforceMode() && result.blocked) {
    return {
      ...result,
      blocked: false,
      reasoning: `[MONITOR MODE] Would have blocked: ${result.reasoning}`,
    };
  }

  return result;
};

/**
 * Guards and blocks user prompts, throwing an error if blocked.
 */
export const guardPromptOrThrow = async (
  userMessage: string,
  options: GuardPromptOptions = {},
): Promise<void> => {
  const result = await guardPrompt(userMessage, options);
  
  if (result.blocked) {
    throw new SecurityViolationError(result);
  }
};

// ============================================================================
// Guard Tool Executions
// ============================================================================

export type GuardToolOptions = {
  userId?: string | null;
  sessionId?: string | null;
  skipAllowlistCheck?: boolean;
};

/**
 * Guards tool executions before they run.
 * Checks both the tool name and its input parameters.
 */
export const guardTool = async (
  toolName: string,
  input: UntypedJson,
  options: GuardToolOptions = {},
): Promise<GuardResult> => {
  if (!isSuperagentEnabled()) {
    return { blocked: false, violations: [] };
  }

  // Check tool allowlist first
  if (!options.skipAllowlistCheck && !isToolAllowed(toolName)) {
    const violation: GuardViolation = {
      id: `tool-not-allowed-${Date.now()}`,
      type: "policy_violation",
      cweCode: "CWE-284",
      severity: "high",
      message: `Tool "${toolName}" is not in the allowed tools list`,
      confidence: 1.0,
    };

    return {
      blocked: isEnforceMode(),
      violations: [violation],
      reasoning: "Tool not in allowlist",
    };
  }

  // Serialize input for analysis
  const inputStr = typeof input === "string" ? input : JSON.stringify(input ?? {});

  const request: GuardRequest = {
    input: inputStr,
    action: "tool_execution",
    toolName,
    metadata: {
      userId: options.userId,
      sessionId: options.sessionId,
      isHighRisk: isHighRiskTool(toolName),
      timestamp: new Date().toISOString(),
    },
  };

  const result = await guardRequest(request);

  // Elevate severity for high-risk tools
  if (isHighRiskTool(toolName) && result.violations.length > 0) {
    result.violations = result.violations.map((v) => ({
      ...v,
      severity: elevateSeverity(v.severity),
    }));
    
    // Re-evaluate blocking based on elevated severity
    const hasBlockable = result.violations.some((v) => shouldBlock(v.severity));
    result.blocked = hasBlockable && isEnforceMode();
  }

  // In monitor mode, never block
  if (!isEnforceMode() && result.blocked) {
    return {
      ...result,
      blocked: false,
      reasoning: `[MONITOR MODE] Would have blocked tool "${toolName}": ${result.reasoning}`,
    };
  }

  return result;
};

/**
 * Guards and blocks tool executions, throwing an error if blocked.
 */
export const guardToolOrThrow = async (
  toolName: string,
  input: UntypedJson,
  options: GuardToolOptions = {},
): Promise<void> => {
  const result = await guardTool(toolName, input, options);
  
  if (result.blocked) {
    throw new SecurityViolationError(result);
  }
};

// ============================================================================
// Guard File Uploads
// ============================================================================

export type GuardFileOptions = {
  userId?: string | null;
  maxContentLength?: number;
};

const DEFAULT_MAX_CONTENT_LENGTH = 1_000_000; // 1MB for content analysis

/**
 * Guards file uploads for prompt injection and malicious content.
 */
export const guardFile = async (
  fileContent: string,
  filename: string,
  mimeType: string,
  options: GuardFileOptions = {},
): Promise<GuardResult> => {
  if (!isSuperagentEnabled()) {
    return { blocked: false, violations: [] };
  }

  const maxLength = options.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
  const truncatedContent = fileContent.length > maxLength
    ? fileContent.slice(0, maxLength)
    : fileContent;

  const request: GuardRequest = {
    input: truncatedContent,
    action: "file_upload",
    metadata: {
      userId: options.userId,
      filename,
      mimeType,
      originalSize: fileContent.length,
      truncated: fileContent.length > maxLength,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await guardRequest(request);

  // In monitor mode, never block
  if (!isEnforceMode() && result.blocked) {
    return {
      ...result,
      blocked: false,
      reasoning: `[MONITOR MODE] Would have blocked file "${filename}": ${result.reasoning}`,
    };
  }

  return result;
};

/**
 * Guards and blocks file uploads, throwing an error if blocked.
 */
export const guardFileOrThrow = async (
  fileContent: string,
  filename: string,
  mimeType: string,
  options: GuardFileOptions = {},
): Promise<void> => {
  const result = await guardFile(fileContent, filename, mimeType, options);
  
  if (result.blocked) {
    throw new SecurityViolationError(result);
  }
};

// ============================================================================
// Guard System Prompts (for dynamic system prompt validation)
// ============================================================================

/**
 * Guards dynamically generated system prompts.
 * Useful when system prompts include user-controlled data.
 */
export const guardSystemPrompt = async (
  systemPrompt: string,
  metadata?: Record<string, UntypedJson>,
): Promise<GuardResult> => {
  if (!isSuperagentEnabled()) {
    return { blocked: false, violations: [] };
  }

  const request: GuardRequest = {
    input: systemPrompt,
    action: "system_prompt",
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await guardRequest(request);

  // System prompt violations are always critical
  if (result.violations.length > 0) {
    result.violations = result.violations.map((v) => ({
      ...v,
      severity: "critical" as SeverityLevel,
    }));
    result.blocked = isEnforceMode();
  }

  return result;
};

// ============================================================================
// Guard Tool Outputs (for prompt injection in tool responses)
// ============================================================================

export type GuardToolOutputOptions = {
  toolName: string;
  userId?: string | null;
};

/**
 * Scans tool outputs for prompt injection attempts.
 * Returns a sanitized flag if suspicious patterns are detected.
 * This is a lightweight local check — no remote API call.
 */
export const guardToolOutput = (
  output: string,
  options: GuardToolOutputOptions,
): { suspicious: boolean; reason: string | null } => {
  if (!isSuperagentEnabled()) {
    return { suspicious: false, reason: null };
  }

  const isSuspicious = detectToolOutputInjection(output);
  if (isSuspicious) {
    return {
      suspicious: true,
      reason: `Tool "${options.toolName}" output contains patterns that may indicate prompt injection.`,
    };
  }

  return { suspicious: false, reason: null };
};

// ============================================================================
// Helpers
// ============================================================================

const elevateSeverity = (severity: SeverityLevel): SeverityLevel => {
  switch (severity) {
    case "info":
      return "low";
    case "low":
      return "medium";
    case "medium":
      return "high";
    case "high":
    case "critical":
      return "critical";
    default:
      return severity;
  }
};

/**
 * Checks if any violation meets the blocking threshold.
 */
export const hasBlockableViolation = (violations: GuardViolation[]): boolean => {
  return violations.some((v) => shouldBlock(v.severity));
};

/**
 * Gets the highest severity from a list of violations.
 */
export const getHighestSeverity = (violations: GuardViolation[]): SeverityLevel | null => {
  if (violations.length === 0) return null;
  
  const severityOrder: SeverityLevel[] = ["critical", "high", "medium", "low", "info"];
  
  for (const severity of severityOrder) {
    if (violations.some((v) => v.severity === severity)) {
      return severity;
    }
  }
  
  return null;
};

