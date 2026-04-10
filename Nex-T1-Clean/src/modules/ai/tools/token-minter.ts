import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  TokenMinterMcpClient,
  defaultTokenMinterClient,
} from "@/server/services/mcp/token-minter-client";

const TOKEN_MINTER_TOOL_NAMES = [
  "deployToken",
  "transferToken",
  "getTransactionInfo",
  "getTokenBalance",
  "getTokenInfo",
  "getBalance",
] as const;

export const tokenMinterTool = createMcpCommandTool({
  name: "tokenMinter",
  description:
    "Deploy ERC-20 tokens, transfer balances, and query token or native balances across supported chains.",
  commandNames: TOKEN_MINTER_TOOL_NAMES,
  client: defaultTokenMinterClient,
  clientFactory: () => new TokenMinterMcpClient(),
});
