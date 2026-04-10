import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const loggerMocks = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMocks,
}));

import { McpService } from "@/lib/mcp/mcp-service";

type MockSupabaseLike = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

describe("McpService.getUserConfigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when there is no authenticated user", async () => {
    const from = vi.fn();
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const supabase: MockSupabaseLike = {
      auth: { getUser },
      from,
    };

    const result = await McpService.getUserConfigs(supabase as unknown as SupabaseClient);

    expect(result).toEqual([]);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
    expect(loggerMocks.error).not.toHaveBeenCalled();
  });

  it("falls back from join query and attaches registry metadata", async () => {
    const selectJoin = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "join failed" },
    });

    const selectConfigs = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: "user-1",
          mcp_id: "mcp-1",
          enabled: true,
          config_overrides: {},
        },
      ],
      error: null,
    });

    const inQuery = vi.fn().mockResolvedValue({
      data: [
        {
          id: "mcp-1",
          name: "Wallet MCP",
          sre_url: "https://example.com/mcp",
        },
      ],
      error: null,
    });

    const selectRegistry = vi.fn().mockReturnValue({
      in: inQuery,
    });

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: selectJoin })
      .mockReturnValueOnce({ select: selectConfigs })
      .mockReturnValueOnce({ select: selectRegistry });

    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const supabase: MockSupabaseLike = {
      auth: { getUser },
      from,
    };

    const result = await McpService.getUserConfigs(supabase as unknown as SupabaseClient);

    expect(result).toEqual([
      {
        user_id: "user-1",
        mcp_id: "mcp-1",
        enabled: true,
        config_overrides: {},
        mcp_registry: {
          id: "mcp-1",
          name: "Wallet MCP",
          sre_url: "https://example.com/mcp",
        },
      },
    ]);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Error fetching MCP configs with embedded join, falling back:",
      { message: "join failed" },
    );
    expect(loggerMocks.error).not.toHaveBeenCalled();
  });
});
