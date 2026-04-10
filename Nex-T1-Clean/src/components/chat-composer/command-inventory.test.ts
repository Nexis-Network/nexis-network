import { describe, expect, it } from "vitest";

import {
  buildCommandInventory,
  createInventoryInsertText,
  type CommandInventoryArtifact,
  type CommandInventoryCapability,
  type CommandInventoryMcpServer,
  type CommandInventoryTool,
} from "@/components/chat-composer/command-inventory";

describe("buildCommandInventory", () => {
  it("builds high-level filters and excludes deprecated MCP servers", () => {
    const tools: CommandInventoryTool[] = [
      {
        id: "market_intelligence",
        label: "Market Intelligence",
        description: "Cross-source market analysis.",
        category: "market",
      },
      {
        id: "emit_artifact",
        label: "Emit Artifact",
        description: "Create structured right-panel payloads.",
        category: "ai",
      },
    ];
    const capabilities: CommandInventoryCapability[] = [
      {
        id: "cap-market-research",
        label: "Market Research",
        description: "Compare market structure, price action, and flows.",
        category: "analysis",
      },
    ];
    const artifacts: CommandInventoryArtifact[] = [
      {
        id: "pyth-chart",
        label: "Pyth Chart",
        description: "Interactive live market chart.",
      },
    ];
    const mcpServers: CommandInventoryMcpServer[] = [
      {
        id: "mcp-nex",
        name: "Nex MCP",
        description: "Wallets, DeFi, and onchain read/write helpers.",
        category: "defi",
        status: "active",
      },
      {
        id: "mcp-old",
        name: "Legacy MCP",
        description: "Deprecated server that should not be shown.",
        category: "general",
        status: "deprecated",
      },
    ];

    const inventory = buildCommandInventory({
      tools,
      capabilities,
      artifacts,
      mcpServers,
    });

    expect(inventory.filters.map((filter) => filter.id)).toEqual([
      "all",
      "capability",
      "tool",
      "artifact",
      "mcp",
    ]);
    expect(inventory.items.map((item) => item.id)).toEqual([
      "cap-market-research",
      "market_intelligence",
      "emit_artifact",
      "pyth-chart",
      "mcp-nex",
    ]);
    expect(inventory.countsByKind).toEqual({
      capability: 1,
      tool: 2,
      artifact: 1,
      mcp: 1,
    });
  });
});

describe("createInventoryInsertText", () => {
  it("creates kind-aware prompt scaffolds", () => {
    expect(
      createInventoryInsertText({
        id: "market_intelligence",
        kind: "tool",
        label: "Market Intelligence",
      }),
    ).toBe("Use the `market_intelligence` tool to ");

    expect(
      createInventoryInsertText({
        id: "pyth-chart",
        kind: "artifact",
        label: "Pyth Chart",
      }),
    ).toBe("Create a `pyth-chart` artifact for ");

    expect(
      createInventoryInsertText({
        id: "cap-market-research",
        kind: "capability",
        label: "Market Research",
      }),
    ).toBe("Help me with market research for ");

    expect(
      createInventoryInsertText({
        id: "mcp-nex",
        kind: "mcp",
        label: "Nex MCP",
      }),
    ).toBe("Use the Nex MCP MCP server to ");
  });
});
