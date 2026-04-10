import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  BscMcpClient,
  defaultBscMcpClient,
} from "@/server/services/mcp/bsc-chain-client";

const BSC_CHAIN_TOOL_NAMES = [
  "Send_BNB",
  "Send_BEP20_Token",
  "PancakeSwap_Token_Exchange",
  "Get_Wallet_Info",
  "Buy_Meme_Token",
  "Sell_Meme_Token",
  "Add_PancakeSwap_Liquidity",
  "View_PancakeSwap_Positions",
  "Remove_PancakeSwap_Liquidity",
  "Token_Security_Check",
  "QueryMemeTokenDetails",
] as const;

export const bscChainTool = createMcpCommandTool({
  name: "bsc_chain",
  description:
    "Interact with the TermiX BNBChain MCP server for BSC-native transfers, PancakeSwap V2/V3 swaps, Four.Meme launches, wallet insights, and GoPlus-powered security scans.",
  commandNames: BSC_CHAIN_TOOL_NAMES,
  client: defaultBscMcpClient,
  clientFactory: () => new BscMcpClient(),
});
