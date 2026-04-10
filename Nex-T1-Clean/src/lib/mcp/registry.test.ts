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

import { getSandboxServers } from "@/lib/mcp/registry";

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createThenableBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };

  return builder;
}

describe("getSandboxServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mcp_registry when the sandbox view query fails", async () => {
    const viewError = {
      code: "42P01",
      message: 'relation "mcp_sandbox_servers" does not exist',
    };

    const viewBuilder = createThenableBuilder({
      data: null,
      error: viewError,
    });

    const registryBuilder = createThenableBuilder({
      data: [
        {
          id: "3ca293de-b1ff-4a9e-8aa4-b7d28fb3be4e",
          name: "GitHub MCP",
          description: "Browse repositories and pull requests.",
          source_type: "npm",
          npm_package: "@modelcontextprotocol/server-github",
          docker_image: null,
          repository_url: "https://github.com/modelcontextprotocol/servers",
          install_command: "npm install -g @modelcontextprotocol/server-github",
          run_command: "npx",
          run_args: ["@modelcontextprotocol/server-github"],
          required_env_vars: ["GITHUB_TOKEN"],
          optional_env_vars: [],
          category: "devtools",
          icon_url: null,
          docs_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
          security_tier: "readonly",
          capabilities: ["repos", "issues"],
          status: "active",
          publisher_id: "7cf7f5d7-435b-4962-b6da-2af84a1eec8e",
        },
      ],
      error: null,
    });

    const publishersBuilder = createThenableBuilder({
      data: [
        {
          id: "7cf7f5d7-435b-4962-b6da-2af84a1eec8e",
          name: "Nexis Labs",
          verified: true,
        },
      ],
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "mcp_sandbox_servers") {
        return viewBuilder;
      }

      if (table === "mcp_registry") {
        return registryBuilder;
      }

      if (table === "mcp_publishers") {
        return publishersBuilder;
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    });

    const supabase = { from } as unknown as SupabaseClient;

    const result = await getSandboxServers(supabase);

    expect(result).toEqual([
      {
        id: "3ca293de-b1ff-4a9e-8aa4-b7d28fb3be4e",
        name: "GitHub MCP",
        description: "Browse repositories and pull requests.",
        source_type: "npm",
        npm_package: "@modelcontextprotocol/server-github",
        docker_image: null,
        repository_url: "https://github.com/modelcontextprotocol/servers",
        install_command: "npm install -g @modelcontextprotocol/server-github",
        run_command: "npx",
        run_args: ["@modelcontextprotocol/server-github"],
        required_env_vars: ["GITHUB_TOKEN"],
        optional_env_vars: [],
        category: "devtools",
        icon_url: null,
        docs_url: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
        security_tier: "readonly",
        capabilities: ["repos", "issues"],
        status: "active",
        publisher_name: "Nexis Labs",
        publisher_verified: true,
      },
    ]);

    expect(from).toHaveBeenCalledWith("mcp_sandbox_servers");
    expect(from).toHaveBeenCalledWith("mcp_registry");
    expect(from).toHaveBeenCalledWith("mcp_publishers");
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({ error: viewError }),
      "Error fetching sandbox servers from view, falling back to mcp_registry",
    );
    expect(loggerMocks.error).not.toHaveBeenCalled();
  });

  it("loads publishers separately when the registry fallback cannot rely on a foreign-key join", async () => {
    const viewError = {
      code: "42P01",
      message: 'relation "mcp_sandbox_servers" does not exist',
    };

    const viewBuilder = createThenableBuilder({
      data: null,
      error: viewError,
    });

    const registryBuilder = createThenableBuilder({
      data: [
        {
          id: "0a8ef12d-ef77-4b51-9f4a-2d1bd39f541f",
          name: "Filesystem MCP",
          description: "Read and write local files in a sandbox.",
          source_type: "npm",
          npm_package: "@modelcontextprotocol/server-filesystem",
          docker_image: null,
          repository_url: "https://github.com/modelcontextprotocol/servers",
          install_command:
            "npm install -g @modelcontextprotocol/server-filesystem",
          run_command: "npx",
          run_args: ["@modelcontextprotocol/server-filesystem"],
          required_env_vars: [],
          optional_env_vars: [],
          category: "productivity",
          icon_url: null,
          docs_url:
            "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
          security_tier: "readonly",
          capabilities: ["fs"],
          status: "active",
          publisher_id: "85733d56-33d4-4a4c-b4a1-46347622a9e6",
        },
      ],
      error: null,
    });

    const publishersBuilder = createThenableBuilder({
      data: [
        {
          id: "85733d56-33d4-4a4c-b4a1-46347622a9e6",
          name: "Model Context Protocol",
          verified: true,
        },
      ],
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "mcp_sandbox_servers") {
        return viewBuilder;
      }

      if (table === "mcp_registry") {
        return registryBuilder;
      }

      if (table === "mcp_publishers") {
        return publishersBuilder;
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    });

    const supabase = { from } as unknown as SupabaseClient;

    const result = await getSandboxServers(supabase);

    expect(result).toEqual([
      {
        id: "0a8ef12d-ef77-4b51-9f4a-2d1bd39f541f",
        name: "Filesystem MCP",
        description: "Read and write local files in a sandbox.",
        source_type: "npm",
        npm_package: "@modelcontextprotocol/server-filesystem",
        docker_image: null,
        repository_url: "https://github.com/modelcontextprotocol/servers",
        install_command:
          "npm install -g @modelcontextprotocol/server-filesystem",
        run_command: "npx",
        run_args: ["@modelcontextprotocol/server-filesystem"],
        required_env_vars: [],
        optional_env_vars: [],
        category: "productivity",
        icon_url: null,
        docs_url:
          "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
        security_tier: "readonly",
        capabilities: ["fs"],
        status: "active",
        publisher_name: "Model Context Protocol",
        publisher_verified: true,
      },
    ]);

    expect(from).toHaveBeenCalledWith("mcp_registry");
    expect(from).toHaveBeenCalledWith("mcp_publishers");
    expect(registryBuilder.select).toHaveBeenCalledWith(
      expect.not.stringContaining("mcp_publishers")
    );
    expect(publishersBuilder.in).toHaveBeenCalledWith("id", [
      "85733d56-33d4-4a4c-b4a1-46347622a9e6",
    ]);
    expect(loggerMocks.error).not.toHaveBeenCalled();
  });

  it("falls back to the legacy mcp_registry schema when sandbox columns are not deployed yet", async () => {
    const viewError = {
      code: "PGRST205",
      message:
        "Could not find the table 'public.mcp_sandbox_servers' in the schema cache",
    };

    const viewBuilder = createThenableBuilder({
      data: null,
      error: viewError,
    });

    const modernRegistryBuilder = createThenableBuilder({
      data: null,
      error: {
        code: "42703",
        message: "column mcp_registry.source_type does not exist",
      },
    });

    const legacyRegistryBuilder = createThenableBuilder({
      data: [
        {
          id: "d45c77d2-a4f2-4e08-b5f3-c47c3f30d3ab",
          name: "Legacy Internal MCP",
          sre_url: "http://mcp-legacy.internal:8080",
          transport: "sse",
          is_public: true,
          publisher_id: "7cf7f5d7-435b-4962-b6da-2af84a1eec8e",
        },
      ],
      error: null,
    });

    const publishersBuilder = createThenableBuilder({
      data: [
        {
          id: "7cf7f5d7-435b-4962-b6da-2af84a1eec8e",
          name: "Nexis Labs",
          verified: true,
        },
      ],
      error: null,
    });

    const registryBuilders = [modernRegistryBuilder, legacyRegistryBuilder];

    const from = vi.fn((table: string) => {
      if (table === "mcp_sandbox_servers") {
        return viewBuilder;
      }

      if (table === "mcp_registry") {
        const next = registryBuilders.shift();
        if (!next) {
          throw new Error("No more mcp_registry builders queued");
        }
        return next;
      }

      if (table === "mcp_publishers") {
        return publishersBuilder;
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    });

    const supabase = { from } as unknown as SupabaseClient;

    const result = await getSandboxServers(supabase);

    expect(result).toEqual([
      {
        id: "d45c77d2-a4f2-4e08-b5f3-c47c3f30d3ab",
        name: "Legacy Internal MCP",
        description: "Legacy internal MCP endpoint (sse).",
        source_type: "internal",
        npm_package: null,
        docker_image: null,
        repository_url: null,
        install_command: null,
        run_command: "http://mcp-legacy.internal:8080",
        run_args: [],
        required_env_vars: [],
        optional_env_vars: [],
        category: "integrations",
        icon_url: null,
        docs_url: null,
        security_tier: "readonly",
        capabilities: null,
        status: "active",
        publisher_name: "Nexis Labs",
        publisher_verified: true,
      },
    ]);
  });
});
