import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type CcxtToolName =
  | "fetch_ticker"
  | "fetch_ohlcv"
  | "fetch_order_book"
  | "fetch_markets"
  | "fetch_balance"
  | "fetch_currencies"
  | "fetch_status";

export type CcxtClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_CCXT_BASE_URL ?? "https://ccxt.nex-t1.ai";

export class CcxtMcpClient extends HttpMcpClient<CcxtToolName> {
  constructor(options: CcxtClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_CCXT_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "CCXT MCP",
      },
    );
  }

  async invoke(
    tool: CcxtToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<CcxtToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: CcxtToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<CcxtToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultCcxtClient = new CcxtMcpClient();
