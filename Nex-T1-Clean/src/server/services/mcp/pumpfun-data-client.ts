import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type PumpFunDataToolName = "get_featured_coins" | "get_coins" | "get_coin_info";

export type PumpFunDataClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_PUMPFUN_DATA_BASE_URL ?? "https://pumpfun-data.nex-t1.ai";

export class PumpFunDataMcpClient extends HttpMcpClient<PumpFunDataToolName> {
  constructor(options: PumpFunDataClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_PUMPFUN_DATA_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Pump.fun Data MCP",
      },
    );
  }

  async invoke(
    tool: PumpFunDataToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<PumpFunDataToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: PumpFunDataToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<PumpFunDataToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultPumpFunDataClient = new PumpFunDataMcpClient();
