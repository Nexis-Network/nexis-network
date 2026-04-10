export type CommandInventoryKind = "capability" | "tool" | "artifact" | "mcp";

export type CommandInventoryTool = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export type CommandInventoryCapability = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export type CommandInventoryArtifact = {
  id: string;
  label: string;
  description: string;
};

export type CommandInventoryMcpServer = {
  id: string;
  name: string;
  description: string;
  category: string;
  status?: "active" | "inactive" | "deprecated";
};

export type CommandInventoryItem = {
  id: string;
  kind: CommandInventoryKind;
  label: string;
  description: string;
  category?: string;
};

export type CommandInventoryFilter = {
  id: "all" | CommandInventoryKind;
  label: string;
  count: number;
};

export type CommandInventory = {
  filters: CommandInventoryFilter[];
  items: CommandInventoryItem[];
  countsByKind: Record<CommandInventoryKind, number>;
};

type BuildCommandInventoryArgs = {
  tools: CommandInventoryTool[];
  capabilities: CommandInventoryCapability[];
  artifacts: CommandInventoryArtifact[];
  mcpServers: CommandInventoryMcpServer[];
};

const FILTER_LABELS: Record<CommandInventoryFilter["id"], string> = {
  all: "All",
  capability: "Capabilities",
  tool: "Tools",
  artifact: "Artifacts",
  mcp: "MCP Servers",
};

const SORT_ORDER: Record<CommandInventoryKind, number> = {
  capability: 0,
  tool: 1,
  artifact: 2,
  mcp: 3,
};

export function buildCommandInventory({
  tools,
  capabilities,
  artifacts,
  mcpServers,
}: BuildCommandInventoryArgs): CommandInventory {
  const items = [
    ...capabilities.map((capability) => ({
      id: capability.id,
      kind: "capability" as const,
      label: capability.label,
      description: capability.description,
      category: capability.category,
    })),
    ...tools.map((tool) => ({
      id: tool.id,
      kind: "tool" as const,
      label: tool.label,
      description: tool.description,
      category: tool.category,
    })),
    ...artifacts.map((artifact) => ({
      id: artifact.id,
      kind: "artifact" as const,
      label: artifact.label,
      description: artifact.description,
    })),
    ...mcpServers
      .filter((server) => server.status !== "deprecated" && server.status !== "inactive")
      .map((server) => ({
        id: server.id,
        kind: "mcp" as const,
        label: server.name,
        description: server.description,
        category: server.category,
      })),
  ].map((item, index) => ({ item, index }));

  const sortedItems: CommandInventoryItem[] = items
    .sort((left, right) => {
      const kindDiff = SORT_ORDER[left.item.kind] - SORT_ORDER[right.item.kind];
      if (kindDiff !== 0) {
        return kindDiff;
      }
      return left.index - right.index;
    })
    .map(({ item }) => item);

  const countsByKind = sortedItems.reduce<Record<CommandInventoryKind, number>>(
    (accumulator, item) => {
      accumulator[item.kind] += 1;
      return accumulator;
    },
    {
      capability: 0,
      tool: 0,
      artifact: 0,
      mcp: 0,
    },
  );

  const filters: CommandInventoryFilter[] = [
    {
      id: "all",
      label: FILTER_LABELS.all,
      count: sortedItems.length,
    },
    {
      id: "capability",
      label: FILTER_LABELS.capability,
      count: countsByKind.capability,
    },
    {
      id: "tool",
      label: FILTER_LABELS.tool,
      count: countsByKind.tool,
    },
    {
      id: "artifact",
      label: FILTER_LABELS.artifact,
      count: countsByKind.artifact,
    },
    {
      id: "mcp",
      label: FILTER_LABELS.mcp,
      count: countsByKind.mcp,
    },
  ];

  return {
    filters,
    items: sortedItems,
    countsByKind,
  };
}

export function createInventoryInsertText(
  item: Pick<CommandInventoryItem, "id" | "kind" | "label">,
): string {
  switch (item.kind) {
    case "tool":
      return `Use the \`${item.id}\` tool to `;
    case "artifact":
      return `Create a \`${item.id}\` artifact for `;
    case "capability":
      return `Help me with ${item.label.toLowerCase()} for `;
    case "mcp":
      return `Use the ${item.label} MCP server to `;
    default: {
      const exhaustive: never = item.kind;
      return exhaustive;
    }
  }
}
