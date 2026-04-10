import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  ChainlinkMcpClient,
  defaultChainlinkClient,
} from "@/server/services/mcp/chainlink-client";

const CHAINLINK_TOOL_NAMES = [
  "getLatestPrice",
  "queryPriceByRound",
  "listSupportedChains",
  "listSupportedFeeds",
  "listSupportedFeedsByChain",
] as const;

export const chainlinkPriceFeedsTool = createMcpCommandTool({
  name: "chainlinkPriceFeeds",
  description:
    "Query Chainlink price feeds for latest prices, supported chains, and feed metadata.",
  commandNames: CHAINLINK_TOOL_NAMES,
  client: defaultChainlinkClient,
  clientFactory: () => new ChainlinkMcpClient(),
});
