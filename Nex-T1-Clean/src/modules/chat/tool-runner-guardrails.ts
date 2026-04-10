import type { TraceContext } from "./langfuse-tracing";
import type { ToolEventEmitter } from "./tool-runner-types";
import { summarizeInput } from "./tool-planning";
import { recordSecurityTrace } from "./langfuse-tracing";

import {
  isToolGuardEnabled,
  isOutputVerifyEnabled,
  isRedactEnabled,
} from "@/server/services/superagent/config";
import { guardTool } from "@/server/services/superagent/guard";
import { redactToolOutput } from "@/server/services/superagent/redact";
import { SecurityViolationError } from "@/server/services/superagent/types";
import { verifyToolOutput } from "@/server/services/superagent/verify";
import { recordSecurityEvent } from "@/modules/security/audit-logger";
import { getToolRiskLevel } from "@/modules/ai/tool-risk-registry";
import { logger } from "@/lib/logger";

export { SecurityViolationError };

export function isToolExecutionGuardEnabled(): boolean {
  return isToolGuardEnabled();
}

export async function guardToolExecution(args: {
  toolName: string;
  input: UntypedJson;
  emitEvent: ToolEventEmitter;
  traceContext: TraceContext | null;
  userId?: string;
  sessionId?: string;
  skipGuardAllowlistCheck: boolean;
}): Promise<void> {
  if (!isToolExecutionGuardEnabled()) {
    return;
  }

  const mustFailClosed = getToolRiskLevel(args.toolName) !== "read_only";

  try {
    const guardResult = await guardTool(args.toolName, args.input, {
      userId: args.userId,
      sessionId: args.sessionId,
      skipAllowlistCheck: args.skipGuardAllowlistCheck,
    });

    if (guardResult.violations.length > 0) {
      await recordSecurityEvent({
        type: guardResult.blocked ? "tool_blocked" : "guard_violation",
        action: guardResult.blocked ? "blocked" : "warned",
        severity: guardResult.violations[0]?.severity ?? "medium",
        violations: guardResult.violations,
        toolName: args.toolName,
        reasoning: guardResult.reasoning,
        metadata: { inputSummary: summarizeInput(args.input) },
      });

      args.emitEvent("security", {
        type: "tool_guard",
        toolName: args.toolName,
        blocked: guardResult.blocked,
        violations: guardResult.violations.map((violation) => ({
          type: violation.type,
          severity: violation.severity,
          message: violation.message,
        })),
      });
    }

    recordSecurityTrace(args.traceContext, {
      type: "tool_guard",
      triggered: guardResult.blocked || guardResult.violations.length > 0,
      violations: guardResult.violations.map((violation) => ({
        type: violation.type,
        severity: violation.severity,
      })),
    });

    if (guardResult.blocked) {
      throw new SecurityViolationError(guardResult);
    }
  } catch (error) {
    if (error instanceof SecurityViolationError) {
      throw error;
    }

    if (mustFailClosed) {
      logger.error(
        `[ToolController] Guard check failed for sensitive tool "${args.toolName}", blocking execution`,
        error,
      );
      throw new Error(`Sensitive tool guard failed for "${args.toolName}"`);
    }

    logger.error(
      `[ToolController] Guard check failed for "${args.toolName}":`,
      error,
    );
  }
}

export async function processToolResultSecurity(args: {
  toolName: string;
  input: UntypedJson;
  resultPayload: UntypedJson;
  emitEvent: ToolEventEmitter;
}): Promise<UntypedJson> {
  if (!isOutputVerifyEnabled() && !isRedactEnabled()) {
    return args.resultPayload;
  }

  let resultPayload = args.resultPayload;

  try {
    if (isOutputVerifyEnabled()) {
      const verifyResult = await verifyToolOutput(args.toolName, resultPayload, {
        toolInput: args.input,
      });

      if (verifyResult.flagged && verifyResult.violations.length > 0) {
        await recordSecurityEvent({
          type: "verify_flagged",
          action: "warned",
          severity: verifyResult.violations[0]?.severity ?? "medium",
          violations: verifyResult.violations,
          toolName: args.toolName,
          reasoning: verifyResult.reasoning,
        });

        args.emitEvent("security", {
          type: "tool_output_flagged",
          toolName: args.toolName,
          violations: verifyResult.violations.map((violation) => ({
            type: violation.type,
            severity: violation.severity,
          })),
        });
      }
    }

    if (isRedactEnabled()) {
      const redacted = await redactToolOutput(resultPayload, args.toolName);
      if (redacted.redactionCount > 0) {
        resultPayload = redacted.redacted;
        await recordSecurityEvent({
          type: "redaction_applied",
          action: "redacted",
          severity: "info",
          toolName: args.toolName,
          metadata: { redactionCount: redacted.redactionCount },
        });
      }
    }
  } catch (error) {
    logger.error(
      `[ToolController] Output processing failed for "${args.toolName}":`,
      error,
    );
  }

  return resultPayload;
}
