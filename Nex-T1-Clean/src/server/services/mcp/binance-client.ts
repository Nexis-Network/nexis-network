import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type BinanceToolName =
  | "get_market_data"
  | "test_futures_endpoints"
  | "get_futures_open_interest"
  | "get_futures_funding_rate"
  | "get_klines"
  | "subscribe_market_data";

export type BinanceClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_BINANCE_BASE_URL ?? "https://binance.nex-t1.ai";
const DEFAULT_REQUEST_TIMEOUT_MS = Number(
  process.env.MCP_BINANCE_TIMEOUT_MS ?? 8_000,
);
const DEFAULT_MAX_RETRIES = Number(process.env.MCP_BINANCE_MAX_RETRIES ?? 0);

export class BinanceMcpClient extends HttpMcpClient<BinanceToolName> {
  constructor(options: BinanceClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_BINANCE_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
        defaultHeaders: options.defaultHeaders,
        name: "Binance MCP",
      },
    );
  }

  async invoke(
    tool: BinanceToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BinanceToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: BinanceToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BinanceToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultBinanceClient = new BinanceMcpClient();
