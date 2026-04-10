import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type UniswapPoolSpyToolName = "get_new_pools";

export type UniswapPoolSpyClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_UNISWAP_POOLSPY_BASE_URL ?? "https://uniswap-spy.nex-t1.ai";

export class UniswapPoolSpyMcpClient extends HttpMcpClient<UniswapPoolSpyToolName> {
  constructor(options: UniswapPoolSpyClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_UNISWAP_POOLSPY_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Uniswap PoolSpy MCP",
      },
    );
  }

  async invoke(
    tool: UniswapPoolSpyToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<UniswapPoolSpyToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: UniswapPoolSpyToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<UniswapPoolSpyToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultUniswapPoolSpyClient = new UniswapPoolSpyMcpClient();
