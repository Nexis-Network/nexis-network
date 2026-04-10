export type ToolErrorCategory =
  | "transient"
  | "validation"
  | "business_rule"
  | "permission"
  | "internal";

export type RetryPolicy = {
  retryable: boolean;
  maxRetries?: number;
  backoffMs?: number;
  retryAfterMs?: number;
};

export type ToolErrorContext = {
  toolName: string;
  toolCallId?: string;
  category?: string; // tool category from getToolCategory
  inputSummary?: string;
};

export class ToolExecutionError extends Error {
  readonly errorCategory: ToolErrorCategory;
  readonly retry: RetryPolicy;
  readonly userExplanation: string;
  readonly internalDetail: string;
  readonly toolContext: ToolErrorContext;
  readonly originalError?: Error;

  constructor(args: {
    errorCategory: ToolErrorCategory;
    retry: RetryPolicy;
    userExplanation: string;
    internalDetail: string;
    toolContext: ToolErrorContext;
    originalError?: Error;
  }) {
    super(args.userExplanation);
    this.name = "ToolExecutionError";
    this.errorCategory = args.errorCategory;
    this.retry = args.retry;
    this.userExplanation = args.userExplanation;
    this.internalDetail = args.internalDetail;
    this.toolContext = args.toolContext;
    this.originalError = args.originalError;
  }
}

export function isErrorContractEnabled(): boolean {
  return process.env.NEX_ERROR_CONTRACT_ENABLED === "true";
}
