import { describe, expect, it } from "vitest";

import { parseMcpRegistryPayload } from "@/components/ai-elements/mcp-catalog-modal.utils";

const validRegistry = {
  version: "1.0.0",
  servers: [
    {
      name: "Example MCP",
      description: "Example description",
      vendor: "Nexis",
      source: {
        type: "http",
        location: "https://example.com/mcp",
      },
      tags: ["test"],
    },
  ],
};

describe("parseMcpRegistryPayload", () => {
  it("unwraps API envelopes and returns registry data", () => {
    const payload = {
      success: true,
      data: validRegistry,
    };

    expect(parseMcpRegistryPayload(payload)).toEqual(validRegistry);
  });

  it("accepts direct registry objects", () => {
    expect(parseMcpRegistryPayload(validRegistry)).toEqual(validRegistry);
  });

  it("returns null for failed API payloads", () => {
    const payload = {
      success: false,
      error: {
        message: "Failed to fetch registry",
      },
    };

    expect(parseMcpRegistryPayload(payload)).toBeNull();
  });

  it("returns null for malformed registry payloads", () => {
    const payload = {
      success: true,
      data: {
        version: "1.0.0",
        servers: "invalid",
      },
    };

    expect(parseMcpRegistryPayload(payload)).toBeNull();
  });
});
