import { createMcpCommandTool } from "./mcp-tool-factory";
import { defaultEtherscanClient, EtherscanMcpClient } from "@/server/services/mcp/etherscan-client";

const ETHERSCAN_TOOL_NAMES = [
  "check-balance",
  "get-transactions",
  "get-token-transfers",
  "get-contract-abi",
  "get-gas-prices",
  "get-ens-name",
] as const;

export const etherscanTool = createMcpCommandTool({
  name: "etherscan",
  description:
    "Query Ethereum balances, transactions, token transfers, contract ABIs, gas prices, and ENS records via Etherscan.",
  commandNames: ETHERSCAN_TOOL_NAMES,
  client: defaultEtherscanClient,
  clientFactory: () => new EtherscanMcpClient(),
});
