import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type BscMcpToolName =
  | "Send_BNB"
  | "Send_BEP20_Token"
  | "PancakeSwap_Token_Exchange"
  | "Get_Wallet_Info"
  | "Buy_Meme_Token"
  | "Sell_Meme_Token"
  | "Add_PancakeSwap_Liquidity"
  | "View_PancakeSwap_Positions"
  | "Remove_PancakeSwap_Liquidity"
  | "Token_Security_Check"
  | "QueryMemeTokenDetails";

export type BscMcpClientOptions = HttpMcpClientOptions;

const envBaseUrl = process.env.MCP_BSC_BASE_URL?.trim();
const DEFAULT_BASE_URL = envBaseUrl || "https://bsc-mcp.nex-t1.ai";
const DEFAULT_TIMEOUT =
  Number.parseInt(process.env.MCP_BSC_TIMEOUT_MS ?? "", 10) || 20_000;
const DEFAULT_RETRIES =
  Number.parseInt(process.env.MCP_BSC_RETRY_COUNT ?? "", 10) || 2;

export class BscMcpClient extends HttpMcpClient<BscMcpToolName> {
  constructor(options: BscMcpClientOptions = {}) {
    super({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: options.apiKey ?? process.env.MCP_BSC_API_KEY,
      requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_RETRIES,
      defaultHeaders: options.defaultHeaders,
      name: "BSC MCP",
    });
  }

  async invoke(
    tool: BscMcpToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BscMcpToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: BscMcpToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BscMcpToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultBscMcpClient = new BscMcpClient();
