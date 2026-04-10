import { createMcpCommandTool } from "./mcp-tool-factory";
import { DefiLlamaMcpClient, defaultDefiLlamaClient } from "@/server/services/mcp/defillama-client";

const DEFILLAMA_TOOL_NAMES = [
  "get_protocols",
  "get_protocol_tvl",
  "get_chain_tvl",
  "get_token_prices",
  "get_pools",
  "get_pool_tvl",
] as const;

export const defiLlamaTool = createMcpCommandTool({
  name: "defiLlama",
  description:
    "Access DeFiLlama data for protocol TVL, chain analytics, token pricing, and liquidity pool metrics.",
  commandNames: DEFILLAMA_TOOL_NAMES,
  client: defaultDefiLlamaClient,
  clientFactory: () => new DefiLlamaMcpClient(),
});
