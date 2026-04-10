import type { AIEvent } from "@/lib/schema";

import { coerceString } from "./utils";

const STRONG_TRANSACTION_WORKFLOW_PATTERNS = [
  /\btransaction\b/i,
  /\btx\b/i,
  /\bswap\b/i,
  /\bbridge\b/i,
  /\bcross[\s-_]?chain\b/i,
  /\bon[\s-_]?chain\b/i,
  /\bquote\b/i,
  /\bdeposit\b/i,
  /\bwithdraw\b/i,
  /\bsettle\b/i,
  /\borigin\b/i,
  /\bdestination\b/i,
  /\bconfirm(?:ed)?\b/i,
] as const;

const WEAK_TRANSACTION_WORKFLOW_PATTERNS = [
  /\bapprove\b/i,
  /\bsign\b/i,
  /\bsubmit(?:ted)?\b/i,
  /\bexecute\b/i,
] as const;

const IDE_BOOTSTRAP_WORKFLOW_STEPS = new Set([
  "context_build",
  "prompt_build",
  "tool_setup",
]);

const IDE_WORKBENCH_WORKFLOW_PATTERNS = [
  /\bcode\b/i,
  /\bcoder\b/i,
  /\bbuild\b/i,
  /\bpreview\b/i,
  /\bterminal\b/i,
  /\btest\b/i,
  /\brunner\b/i,
  /\bsandbox\b/i,
  /\binstall\b/i,
  /\bnpm\b/i,
  /\bcompile\b/i,
  /\bsimulat(?:e|ion|or)\b/i,
  /\bfile\b/i,
  /\bcontract\b/i,
  /\bjsx\b/i,
  /\bhtml\b/i,
] as const;

export function matchesWorkflowPattern(value: string | null): boolean {
  return Boolean(
    value && STRONG_TRANSACTION_WORKFLOW_PATTERNS.some((pattern) => pattern.test(value)),
  );
}

export function matchesWeakTransactionWorkflowPattern(
  value: string | null,
): boolean {
  return Boolean(
    value && WEAK_TRANSACTION_WORKFLOW_PATTERNS.some((pattern) => pattern.test(value)),
  );
}

export function isLikelyTransactionOrBridgeWorkflowEvent(
  event: Extract<AIEvent, { type: "workflow_update" }>,
): boolean {
  return (
    matchesWorkflowPattern(event.workflowId) ||
    matchesWorkflowPattern(event.stepName)
  );
}

export function shouldIncludeWorkflowEventInIdePlan(
  event: Extract<AIEvent, { type: "workflow_update" }>,
): boolean {
  const stepName = coerceString(event.stepName)?.toLowerCase() ?? "";
  if (IDE_BOOTSTRAP_WORKFLOW_STEPS.has(stepName)) {
    return false;
  }

  if (isLikelyTransactionOrBridgeWorkflowEvent(event)) {
    return false;
  }

  const haystack = `${event.workflowId} ${event.stepName}`;
  return IDE_WORKBENCH_WORKFLOW_PATTERNS.some((pattern) => pattern.test(haystack));
}
