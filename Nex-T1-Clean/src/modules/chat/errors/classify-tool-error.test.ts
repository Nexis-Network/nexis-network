import { describe, it, expect, vi } from "vitest";
import { classifyToolError } from "./classify-tool-error";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/modules/chat/tool-approval-policy", () => ({
  getToolCategory: vi.fn((name: string) => `cat:${name}`),
}));

vi.mock("@/modules/chat/tool-planning", () => ({
  summarizeInput: vi.fn(() => "input-summary"),
}));

vi.mock("@/server/services/superagent/types", () => {
  class SecurityViolationError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "SecurityViolationError";
    }
  }
  return { SecurityViolationError };
});

describe("classifyToolError", () => {
  it('classifies rate limit errors as "transient" and retryable', () => {
    const err429 = new Error("Request failed with status 429");
    const result = classifyToolError(err429, "my_tool", "call-1");
    expect(result.errorCategory).toBe("transient");
    expect(result.retry.retryable).toBe(true);

    const errRateLimit = new Error("rate limit exceeded");
    const result2 = classifyToolError(errRateLimit, "my_tool");
    expect(result2.errorCategory).toBe("transient");
    expect(result2.retry.retryable).toBe(true);
  });

  it('classifies timeout/network errors as "transient" and retryable', () => {
    for (const msg of ["ETIMEDOUT", "ECONNRESET", "Connection timeout"]) {
      const result = classifyToolError(new Error(msg), "my_tool");
      expect(result.errorCategory).toBe("transient");
      expect(result.retry.retryable).toBe(true);
    }
  });

  it('classifies balance/slippage errors as "business_rule" and not retryable', () => {
    for (const msg of [
      "insufficient balance",
      "slippage too high",
      "not enough liquidity",
    ]) {
      const result = classifyToolError(new Error(msg), "my_tool");
      expect(result.errorCategory).toBe("business_rule");
      expect(result.retry.retryable).toBe(false);
    }
  });

  it('classifies Zod validation errors as "validation" and not retryable', () => {
    const zodLikeError = { issues: [{ message: "Required" }] };
    const result = classifyToolError(zodLikeError, "my_tool");
    expect(result.errorCategory).toBe("validation");
    expect(result.retry.retryable).toBe(false);
  });

  it('classifies unknown errors as "internal" and not retryable', () => {
    const result = classifyToolError(new Error("something weird"), "my_tool");
    expect(result.errorCategory).toBe("internal");
    expect(result.retry.retryable).toBe(false);
  });

  it("populates userExplanation with a safe user-facing message", () => {
    const result = classifyToolError(
      new Error("Internal pg connection pool exhausted: password=abc123"),
      "my_tool",
    );
    // userExplanation should be generic, not the raw internal error
    expect(result.userExplanation).toBeDefined();
    expect(result.userExplanation).not.toContain("abc123");
    expect(result.userExplanation).not.toContain("pg connection");
  });

  it("populates toolContext.toolName correctly", () => {
    const result = classifyToolError(new Error("fail"), "swap_tokens", "call-7");
    expect(result.toolContext.toolName).toBe("swap_tokens");
    expect(result.toolContext.toolCallId).toBe("call-7");
  });
});
