import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type DefiLlamaToolName =
  | "get_protocols"
  | "get_protocol_tvl"
  | "get_chain_tvl"
  | "get_token_prices"
  | "get_pools"
  | "get_pool_tvl";

export type DefiLlamaClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_DEFILLAMA_BASE_URL ?? "https://defillama.nex-t1.ai";

export class DefiLlamaMcpClient extends HttpMcpClient<DefiLlamaToolName> {
  constructor(options: DefiLlamaClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_DEFILLAMA_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "DefiLlama MCP",
      },
    );
  }

  async invoke(
    tool: DefiLlamaToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<DefiLlamaToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: DefiLlamaToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<DefiLlamaToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultDefiLlamaClient = new DefiLlamaMcpClient();
