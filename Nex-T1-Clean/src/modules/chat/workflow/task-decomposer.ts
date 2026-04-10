import type { WorkingTodo } from "@/modules/chat/state/working-memory-store";
import { isWorkflowGatesEnabled } from "./workflow-rules";

/**
 * Patterns that suggest a multi-concern request.
 * Matches phrases like "and also", "and then", "plus", "as well as".
 */
const MULTI_CONCERN_PATTERNS = [
  /\band\s+(?:also|then)\b/i,
  /\bplus\b/i,
  /\bas\s+well\s+as\b/i,
  /\balso\b.*\b(?:check|show|get|find|swap|send|buy|sell|stake|bridge)\b/i,
  /\b(?:first|then|after that|next|finally)\b/i,
];

export type DecomposedTask = Omit<WorkingTodo, "createdAt" | "updatedAt">;

/**
 * Returns true if the message likely contains multiple distinct requests.
 */
export function isMultiConcernRequest(message: string): boolean {
  if (!isWorkflowGatesEnabled()) return false;
  return MULTI_CONCERN_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Decomposes a user message into discrete task items.
 *
 * This is a lightweight heuristic decomposition — it splits on
 * conjunction patterns and assigns dependencies based on order.
 * For complex decomposition, use the LLM-based orchestrator instead.
 *
 * @returns Array of task stubs. Returns a single-item array for
 *          simple requests.
 */
export function decomposeRequest(
  message: string,
  requestId: string,
): DecomposedTask[] {
  if (!isWorkflowGatesEnabled()) {
    return [createSingleTask(message, requestId)];
  }

  if (!isMultiConcernRequest(message)) {
    return [createSingleTask(message, requestId)];
  }

  // Split on conjunction patterns
  const segments = message
    .split(/\b(?:and\s+(?:also|then)|plus|as\s+well\s+as|,\s*(?:and|then))\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length <= 1) {
    return [createSingleTask(message, requestId)];
  }

  const tasks: DecomposedTask[] = [];
  let previousTaskId: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const taskId = `${requestId}-${i}`;
    const isFinancial = containsFinancialAction(segment);

    const task: DecomposedTask = {
      id: taskId,
      title: segment,
      status: i === 0 ? "in_progress" : "pending",
      blocks: i < segments.length - 1 ? [`${requestId}-${i + 1}`] : [],
      // Financial tasks depend on prior tasks; read-only tasks can be parallel
      blockedBy: isFinancial && previousTaskId ? [previousTaskId] : [],
      verification: isFinancial ? ["price_check"] : [],
      completedVerification: [],
      nextActions: [],
    };

    tasks.push(task);
    if (isFinancial) {
      previousTaskId = taskId;
    }
  }

  return tasks;
}

function createSingleTask(message: string, requestId: string): DecomposedTask {
  return {
    id: requestId,
    title: message.slice(0, 200),
    status: "in_progress",
    blocks: [],
    blockedBy: [],
    verification: [],
    completedVerification: [],
    nextActions: [],
  };
}

function containsFinancialAction(text: string): boolean {
  const financialKeywords = ["swap", "send", "transfer", "bridge", "buy", "sell", "stake", "unstake", "mint", "deploy"];
  const lower = text.toLowerCase();
  return financialKeywords.some((kw) => lower.includes(kw));
}
