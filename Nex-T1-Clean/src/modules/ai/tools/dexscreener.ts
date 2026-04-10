import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  DexscreenerMcpClient,
  defaultDexscreenerClient,
} from "@/server/services/mcp/dexscreener-client";

const DEXSCREENER_TOOL_NAMES = [
  "get_latest_token_profiles",
  "get_latest_boosted_tokens",
  "get_top_boosted_tokens",
  "get_token_orders",
  "get_pairs_by_chain_and_address",
  "get_pairs_by_token_addresses",
  "search_pairs",
] as const;

export const dexscreenerTool = createMcpCommandTool({
  name: "dexscreener",
  description:
    "Query DexScreener for token profiles, boosted lists, orders, and pair analytics across supported chains.",
  commandNames: DEXSCREENER_TOOL_NAMES,
  client: defaultDexscreenerClient,
  clientFactory: () => new DexscreenerMcpClient(),
});
