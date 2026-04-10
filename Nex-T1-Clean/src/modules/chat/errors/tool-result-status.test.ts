import { describe, it, expect } from "vitest";
import { classifyToolResult } from "./tool-result-status";

describe("classifyToolResult", () => {
  it('returns "success" for normal objects with data', () => {
    expect(classifyToolResult("tool", { price: 100, symbol: "SOL" })).toBe("success");
    expect(classifyToolResult("tool", { items: [1, 2, 3] })).toBe("success");
  });

  it('returns "empty_result" for null, undefined, empty array, empty object', () => {
    expect(classifyToolResult("tool", null)).toBe("empty_result");
    expect(classifyToolResult("tool", undefined)).toBe("empty_result");
    expect(classifyToolResult("tool", [])).toBe("empty_result");
    expect(classifyToolResult("tool", {})).toBe("empty_result");
  });

  it('returns "error" for objects with error or errorMessage field', () => {
    expect(classifyToolResult("tool", { error: "something failed" })).toBe("error");
    expect(classifyToolResult("tool", { errorMessage: "bad request" })).toBe("error");
  });

  it('returns "permission_denied" for objects with accessDenied or status 401/403', () => {
    expect(classifyToolResult("tool", { accessDenied: true })).toBe("permission_denied");
    expect(classifyToolResult("tool", { unauthorized: true })).toBe("permission_denied");
    expect(classifyToolResult("tool", { status: 401 })).toBe("permission_denied");
    expect(classifyToolResult("tool", { status: 403 })).toBe("permission_denied");
  });

  it('returns "partial_result" for objects with partial: true or incomplete: true', () => {
    expect(classifyToolResult("tool", { partial: true, data: [1] })).toBe("partial_result");
    expect(classifyToolResult("tool", { incomplete: true, data: [1] })).toBe("partial_result");
  });
});
