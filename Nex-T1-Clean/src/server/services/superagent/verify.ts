/**
 * Superagent Guardrails - Verify Functions
 * Domain: security
 * Responsibility: Output validation and compliance checking
 * Depends on: client, config, types
 */

import { verify as verifyRequest } from "./client";
import {
  isSuperagentEnabled,
  isEnforceMode,
  isOutputVerifyEnabled,
} from "./config";
import type {
  VerifyRequest,
  VerifyResult,
  GuardViolation,
  SeverityLevel,
} from "./types";

// ============================================================================
// Verify Model Outputs
// ============================================================================

export type VerifyOutputOptions = {
  userId?: string | null;
  sessionId?: string | null;
  toolCalls?: UntypedJson[];
  systemPrompt?: string;
  userPrompt?: string;
};

/**
 * Verifies AI model outputs for safety and compliance.
 */
export const verifyModelOutput = async (
  output: string,
  options: VerifyOutputOptions = {},
): Promise<VerifyResult> => {
  if (!isSuperagentEnabled() || !isOutputVerifyEnabled()) {
    return { flagged: false, violations: [] };
  }

  const request: VerifyRequest = {
    output,
    action: "model_output",
    context: {
      toolCalls: options.toolCalls,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
    },
    metadata: {
      userId: options.userId,
      sessionId: options.sessionId,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await verifyRequest(request);

  // In monitor mode, mark as flagged but suggest not to block
  if (!isEnforceMode() && result.flagged) {
    return {
      ...result,
      reasoning: `[MONITOR MODE] Output flagged: ${result.reasoning}`,
    };
  }

  return result;
};

// ============================================================================
// Verify Tool Outputs
// ============================================================================

export type VerifyToolOutputOptions = {
  userId?: string | null;
  sessionId?: string | null;
  toolInput?: UntypedJson;
};

/**
 * Verifies tool execution outputs for safety.
 */
export const verifyToolOutput = async (
  toolName: string,
  output: UntypedJson,
  options: VerifyToolOutputOptions = {},
): Promise<VerifyResult> => {
  if (!isSuperagentEnabled() || !isOutputVerifyEnabled()) {
    return { flagged: false, violations: [] };
  }

  const outputStr = typeof output === "string" ? output : JSON.stringify(output ?? {});

  const request: VerifyRequest = {
    output: outputStr,
    toolName,
    action: "tool_output",
    context: {
      toolCalls: options.toolInput ? [{ name: toolName, input: options.toolInput }] : undefined,
    },
    metadata: {
      userId: options.userId,
      sessionId: options.sessionId,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await verifyRequest(request);

  // In monitor mode, mark as flagged but don't block
  if (!isEnforceMode() && result.flagged) {
    return {
      ...result,
      reasoning: `[MONITOR MODE] Tool "${toolName}" output flagged: ${result.reasoning}`,
    };
  }

  return result;
};

// ============================================================================
// Combined Verification
// ============================================================================

export type VerifyResponseOptions = {
  userId?: string | null;
  sessionId?: string | null;
  toolCalls?: Array<{
    name: string;
    input?: UntypedJson;
    output?: UntypedJson;
  }>;
  systemPrompt?: string;
  userPrompt?: string;
};

/**
 * Verifies a complete response including message and all tool outputs.
 */
export const verifyCompleteResponse = async (
  message: string,
  options: VerifyResponseOptions = {},
): Promise<{
  modelVerification: VerifyResult;
  toolVerifications: Array<{ toolName: string; result: VerifyResult }>;
  overallFlagged: boolean;
  allViolations: GuardViolation[];
}> => {
  // Verify model output
  const modelVerification = await verifyModelOutput(message, {
    userId: options.userId,
    sessionId: options.sessionId,
    toolCalls: options.toolCalls,
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
  });

  // Verify each tool output
  const toolVerifications: Array<{ toolName: string; result: VerifyResult }> = [];
  
  if (options.toolCalls) {
    for (const toolCall of options.toolCalls) {
      if (toolCall.output !== undefined) {
        const result = await verifyToolOutput(toolCall.name, toolCall.output, {
          userId: options.userId,
          sessionId: options.sessionId,
          toolInput: toolCall.input,
        });
        toolVerifications.push({ toolName: toolCall.name, result });
      }
    }
  }

  // Aggregate results
  const allViolations: GuardViolation[] = [
    ...modelVerification.violations,
    ...toolVerifications.flatMap((tv) => tv.result.violations),
  ];

  const overallFlagged = modelVerification.flagged || 
    toolVerifications.some((tv) => tv.result.flagged);

  return {
    modelVerification,
    toolVerifications,
    overallFlagged,
    allViolations,
  };
};

// ============================================================================
// Output Sanitization
// ============================================================================

/**
 * Sanitizes flagged output by removing or replacing problematic content.
 */
export const sanitizeOutput = (
  output: string,
  verifyResult: VerifyResult,
): string => {
  if (!verifyResult.flagged || verifyResult.violations.length === 0) {
    return output;
  }

  let sanitized = output;

  for (const violation of verifyResult.violations) {
    if (violation.location && violation.evidence) {
      // Replace specific evidence with redaction
      sanitized = sanitized.replace(
        violation.evidence,
        `[CONTENT REMOVED: ${violation.type}]`,
      );
    }
  }

  // If we couldn't specifically redact, and there are severe violations,
  // add a warning prefix
  const hasSevereViolation = verifyResult.violations.some(
    (v) => v.severity === "critical" || v.severity === "high",
  );

  if (hasSevereViolation && sanitized === output) {
    sanitized = `[Security Notice: This response may contain flagged content]\n\n${output}`;
  }

  return sanitized;
};

// ============================================================================
// Policy Compliance
// ============================================================================

export type ComplianceCheckOptions = {
  policies?: string[];
  factCheckRequired?: boolean;
};

/**
 * Checks output compliance against specified policies.
 */
export const checkCompliance = async (
  output: string,
  _options: ComplianceCheckOptions = {},
): Promise<{
  compliant: boolean;
  violations: GuardViolation[];
  factualAccuracy?: number;
}> => {
  const result = await verifyModelOutput(output, {});

  return {
    compliant: !result.flagged && (result.policyCompliance ?? true),
    violations: result.violations,
    factualAccuracy: result.factualAccuracy,
  };
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets violation summary for logging.
 */
export const getViolationSummary = (violations: GuardViolation[]): string => {
  if (violations.length === 0) {
    return "No violations";
  }

  const byType = violations.reduce(
    (acc, v) => {
      acc[v.type] = (acc[v.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(byType)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
};

/**
 * Filters violations by minimum severity.
 */
export const filterBySeverity = (
  violations: GuardViolation[],
  minSeverity: SeverityLevel,
): GuardViolation[] => {
  const severityOrder: SeverityLevel[] = ["critical", "high", "medium", "low", "info"];
  const minIndex = severityOrder.indexOf(minSeverity);

  return violations.filter((v) => {
    const vIndex = severityOrder.indexOf(v.severity);
    return vIndex <= minIndex;
  });
};

