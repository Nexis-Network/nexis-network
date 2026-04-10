import {
  buildCommandInventory,
  type CommandInventoryArtifact,
  type CommandInventoryCapability,
  type CommandInventoryTool,
} from "@/components/chat-composer/command-inventory";
import { ARTIFACT_TYPES } from "@/modules/ai/metaprompts/artifact-guide";
import {
  getChatbotToolCatalog,
  type ChatbotToolCatalogEntry,
} from "@/modules/ai/chatbot/toolset-catalog";
import { getCommandInventoryMcpServers } from "@/server/chat/command-inventory-mcp";

const ARTIFACT_DESCRIPTION_MAP: Partial<Record<(typeof ARTIFACT_TYPES)[number], string>> = {
  "agent-wallets": "Display managed wallets, addresses, and metadata in the right panel.",
  "portfolio-analysis": "Summarize holdings, exposure, and portfolio-level insights.",
  "combined-holdings": "Aggregate holdings across wallets or chains.",
  "staking-positions": "Show staking allocations, yields, and validator positions.",
  "agent-daos": "Present DAO research, governance, and treasury snapshots.",
  "dao-workspace": "Open the full DAO management workspace artifact.",
  "dao-proposals": "Review governance proposals, votes, and execution readiness.",
  "dao-treasury": "Inspect DAO treasury balances and pending treasury actions.",
  pumpfun: "Open the Pump.fun trading and discovery panel.",
  "burn-rate-chart": "Visualize treasury burn, runway, and expense trends.",
  "table-editor": "Render structured rows, comparisons, and editable table data.",
  "file-analysis": "Inspect uploaded files and extracted insights.",
  "image-artifact": "Display generated images and prompt metadata.",
  "transaction-simulation": "Render simulated transaction steps and outcomes.",
  "pyth-chart": "Open a live market chart with price and news context.",
  "pumpfun-v2": "Use the Pump.fun v2 dashboard artifact.",
  "execution-result": "Display tool or workflow execution receipts.",
  code: "Show generated code in the workbench.",
  preview: "Open a live preview tab in the workbench.",
  web: "Render a website or embedded web surface in the workbench.",
  canvas: "Open a canvas-style interactive artifact.",
  html: "Render generated HTML in the workbench.",
  "pdf-viewer": "Display a PDF or report inside the right panel.",
  "smart-contract-viewer": "Open Solidity or Rust contract files in the workbench.",
  "transaction-flow": "Track multi-step transaction progress and statuses.",
  "polymarket-widget": "Open the interactive Polymarket workspace.",
};

const CAPABILITY_DEFINITIONS: Array<{
  id: string;
  label: string;
  description: string;
  categories: ChatbotToolCatalogEntry["category"][];
}> = [
  {
    id: "cap-research",
    label: "Research & Search",
    description: "Search the web, files, docs, and external knowledge sources.",
    categories: ["search"],
  },
  {
    id: "cap-code-sandbox",
    label: "Code & Sandbox",
    description: "Run code, edit files, install packages, and emit artifacts.",
    categories: ["ai"],
  },
  {
    id: "cap-wallet-ops",
    label: "Wallet Operations",
    description: "Inspect wallets, simulate actions, and handle approval-gated execution.",
    categories: ["wallet"],
  },
  {
    id: "cap-defi-execution",
    label: "DeFi & Trading",
    description: "Quote, bridge, trade, and monitor DeFi and prediction-market workflows.",
    categories: ["defi"],
  },
  {
    id: "cap-market-intelligence",
    label: "Market Intelligence",
    description: "Analyze price action, movers, sentiment, and token fundamentals.",
    categories: ["market"],
  },
  {
    id: "cap-onchain-analysis",
    label: "Onchain Analysis",
    description: "Inspect feeds, contracts, addresses, and chain-level activity.",
    categories: ["onchain"],
  },
  {
    id: "cap-solana",
    label: "Solana & Pump.fun",
    description: "Monitor Solana wallets, pairs, Pump.fun activity, and token flows.",
    categories: ["solana"],
  },
  {
    id: "cap-bitcoin",
    label: "Bitcoin",
    description: "Handle Bitcoin network lookups and approval-gated BTC actions.",
    categories: ["bitcoin"],
  },
  {
    id: "cap-browser",
    label: "Browser Reading",
    description: "Read and inspect web page DOM content from a browser context.",
    categories: ["browser"],
  },
];

const humanize = (value: string): string =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

function buildArtifacts(): CommandInventoryArtifact[] {
  return ARTIFACT_TYPES.map((artifactType) => ({
    id: artifactType,
    label: humanize(artifactType),
    description:
      ARTIFACT_DESCRIPTION_MAP[artifactType] ??
      `Generate or open the ${humanize(artifactType).toLowerCase()} artifact.`,
  }));
}

function buildCapabilities(
  tools: Array<{ category: string }>,
): CommandInventoryCapability[] {
  const availableCategories = new Set(tools.map((tool) => tool.category));

  return CAPABILITY_DEFINITIONS.filter((definition) =>
    definition.categories.some((category) => availableCategories.has(category)),
  ).map((definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    category: definition.categories[0] ?? "general",
  }));
}

function buildTools(tools: ChatbotToolCatalogEntry[]): CommandInventoryTool[] {
  return tools.map((tool) => ({
    id: tool.id,
    label: tool.label,
    description: tool.description,
    category: tool.category,
  }));
}

export async function getChatCommandInventory() {
  const tools = buildTools(await getChatbotToolCatalog());
  const artifacts = buildArtifacts();
  const capabilities = buildCapabilities(tools);
  const mcpServers = await getCommandInventoryMcpServers();

  return buildCommandInventory({
    tools,
    artifacts,
    capabilities,
    mcpServers,
  });
}
