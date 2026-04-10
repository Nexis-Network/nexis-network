import { describe, expect, it } from "vitest";

import { isExistingCdpUserConflict } from "@/server/services/cdp/provision-errors";

describe("isExistingCdpUserConflict", () => {
  it("matches explicit already_exists API conflicts", () => {
    expect(
      isExistingCdpUserConflict({
        statusCode: 409,
        errorType: "already_exists",
        message: "CDP conflict",
      }),
    ).toBe(true);
  });

  it("matches JWT subject association conflicts", () => {
    expect(
      isExistingCdpUserConflict({
        statusCode: 409,
        errorMessage: "This JWT subject is already associated with another user account.",
      }),
    ).toBe(true);
  });

  it("does not match unrelated failures", () => {
    expect(
      isExistingCdpUserConflict({
        statusCode: 500,
        message: "upstream unavailable",
      }),
    ).toBe(false);
  });
});
