import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type DexscreenerToolName =
  | "get_latest_token_profiles"
  | "get_latest_boosted_tokens"
  | "get_top_boosted_tokens"
  | "get_token_orders"
  | "get_pairs_by_chain_and_address"
  | "get_pairs_by_token_addresses"
  | "search_pairs";

export type DexscreenerClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_DEXSCREENER_BASE_URL ?? "https://dexscreener.nex-t1.ai";
const DEFAULT_REQUEST_TIMEOUT_MS = Number(
  process.env.MCP_DEXSCREENER_TIMEOUT_MS ?? 8_000,
);
const DEFAULT_MAX_RETRIES = Number(
  process.env.MCP_DEXSCREENER_MAX_RETRIES ?? 0,
);

export class DexscreenerMcpClient extends HttpMcpClient<DexscreenerToolName> {
  constructor(options: DexscreenerClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_DEXSCREENER_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
        defaultHeaders: options.defaultHeaders,
        name: "Dexscreener MCP",
      },
    );
  }

  async invoke(
    tool: DexscreenerToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<DexscreenerToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: DexscreenerToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<DexscreenerToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultDexscreenerClient = new DexscreenerMcpClient();
