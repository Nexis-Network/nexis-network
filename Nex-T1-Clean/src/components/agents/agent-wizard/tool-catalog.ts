export type ToolCatalogEntry = {
  id: string;
  name: string;
  description: string;
  defaultConfig?: Record<string, UntypedJson>;
};

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Database + auth bindings via MCP",
  },
  {
    id: "moralis",
    name: "Moralis",
    description: "On-chain data (EVM + Solana) via Moralis MCP",
    defaultConfig: { url: "https://moralis.nex-t1.ai/mcp" },
  },
  {
    id: "cdp",
    name: "Nex Wallet",
    description: "Wallet orchestration via the Nex Wallet control plane",
  },
];
