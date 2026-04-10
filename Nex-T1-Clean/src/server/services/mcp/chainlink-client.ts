import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type ChainlinkPriceFeedToolName =
  | "getLatestPrice"
  | "queryPriceByRound"
  | "listSupportedChains"
  | "listSupportedFeeds"
  | "listSupportedFeedsByChain";

export type ChainlinkClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_CHAINLINK_BASE_URL ?? "https://chainlink.nex-t1.ai";

export class ChainlinkMcpClient extends HttpMcpClient<ChainlinkPriceFeedToolName> {
  constructor(options: ChainlinkClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_CHAINLINK_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Chainlink Feeds MCP",
      },
    );
  }

  async invoke(
    tool: ChainlinkPriceFeedToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<ChainlinkPriceFeedToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: ChainlinkPriceFeedToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<ChainlinkPriceFeedToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultChainlinkClient = new ChainlinkMcpClient();
