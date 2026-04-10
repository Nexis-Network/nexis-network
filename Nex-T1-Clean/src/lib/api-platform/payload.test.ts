import { describe, expect, it } from "vitest";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform/payload";

describe("unwrapApiPayload", () => {
  it("returns raw payload when it is not an API envelope", () => {
    const payload = { foo: "bar" };
    expect(unwrapApiPayload<typeof payload>(payload)).toEqual(payload);
  });

  it("unwraps a standard API envelope", () => {
    const payload = { success: true, data: { foo: "bar" } };
    expect(unwrapApiPayload<{ foo: string }>(payload)).toEqual({ foo: "bar" });
  });

  it("unwraps nested API envelopes", () => {
    const payload = {
      success: true,
      data: {
        success: true,
        data: { value: 42 },
      },
    };
    expect(unwrapApiPayload<{ value: number }>(payload)).toEqual({ value: 42 });
  });

  it("returns null when payload data is null", () => {
    const payload = { success: true, data: null };
    expect(unwrapApiPayload(payload)).toBeNull();
  });
});

describe("getApiErrorMessage", () => {
  it("reads error.message from API payload", () => {
    const payload = { success: false, error: { code: "ERR", message: "Bad request" } };
    expect(getApiErrorMessage(payload, "fallback")).toBe("Bad request");
  });

  it("returns fallback when message is unavailable", () => {
    expect(getApiErrorMessage({ success: false }, "fallback")).toBe("fallback");
  });
});
