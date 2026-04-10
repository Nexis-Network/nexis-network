import {
  ToolExecutionError,
  type ToolErrorCategory,
  type RetryPolicy,
} from "./tool-execution-error";
import { getToolCategory } from "@/modules/chat/tool-approval-policy";
import { summarizeInput } from "@/modules/chat/tool-planning";
import { SecurityViolationError } from "@/server/services/superagent/types";

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasIssuesProperty(
  error: unknown,
): error is { issues: unknown[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as Record<string, unknown>).issues)
  );
}

export function classifyToolError(
  error: unknown,
  toolName: string,
  toolCallId?: string,
  input?: UntypedJson,
): ToolExecutionError {
  const message = extractMessage(error);
  const category = getToolCategory(toolName);
  const inputSummary = summarizeInput(input);

  const toolContext = {
    toolName,
    toolCallId,
    category,
    inputSummary,
  };

  let errorCategory: ToolErrorCategory;
  let retry: RetryPolicy;
  let userExplanation: string;

  // SecurityViolationError -> permission
  if (error instanceof SecurityViolationError) {
    errorCategory = "permission";
    retry = { retryable: false };
    userExplanation = "This action was blocked by security policy.";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Rate limiting
  if (/(rate.?limit|429|too many requests)/i.test(message)) {
    errorCategory = "transient";
    retry = { retryable: true, maxRetries: 2, backoffMs: 1000 };
    userExplanation =
      "The service is temporarily rate-limited. Retrying shortly.";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Network / timeout errors
  if (/(timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|503|502)/i.test(message)) {
    errorCategory = "transient";
    retry = { retryable: true, maxRetries: 2, backoffMs: 2000 };
    userExplanation =
      "A temporary network issue occurred. Retrying shortly.";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Business rule: insufficient funds, slippage, liquidity
  if (
    /(insufficient|balance|slippage|liquidity|not enough)/i.test(message)
  ) {
    errorCategory = "business_rule";
    retry = { retryable: false };
    userExplanation =
      "The operation could not be completed due to a business constraint (e.g. insufficient balance or liquidity).";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Zod validation errors (has .issues property)
  if (hasIssuesProperty(error)) {
    errorCategory = "validation";
    retry = { retryable: false };
    userExplanation =
      "The input provided was invalid. Please check the parameters and try again.";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Budget / limit exhausted
  if (/(budget exhausted|limit exceeded)/i.test(message)) {
    errorCategory = "business_rule";
    retry = { retryable: false };
    userExplanation =
      "A usage limit has been reached. Please try again later or adjust your plan.";

    return new ToolExecutionError({
      errorCategory,
      retry,
      userExplanation,
      internalDetail: message,
      toolContext,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // Fallback: internal error
  errorCategory = "internal";
  retry = { retryable: false };
  userExplanation =
    "An unexpected error occurred while executing the tool. Please try again.";

  return new ToolExecutionError({
    errorCategory,
    retry,
    userExplanation,
    internalDetail: message,
    toolContext,
    originalError: error instanceof Error ? error : undefined,
  });
}
