export class RateLimitExceededError extends Error {
  readonly retryAfter: number;
  readonly status: number;

  constructor(retryAfter: number, status = 429) {
    let message = "Rate limit exceeded. Please try again later.";
    if (status === 402) {
      message = "Credits exhausted. Please upgrade your plan or buy more credits.";
    }
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfter = retryAfter;
    this.status = status;
  }
}

export class ContentBlockedError extends Error {
  readonly violations: UntypedJson[];
  readonly status: number;

  constructor(message: string, violations: UntypedJson[] = [], status = 422) {
    super(message);
    this.name = "ContentBlockedError";
    this.violations = violations;
    this.status = status;
  }
}

export class ModelAccessRestrictedError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "ModelAccessRestrictedError";
    this.status = status;
  }
}
