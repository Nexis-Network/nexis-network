import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type EtherscanToolName =
  | "check-balance"
  | "get-transactions"
  | "get-token-transfers"
  | "get-contract-abi"
  | "get-gas-prices"
  | "get-ens-name";

export type EtherscanClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_ETHERSCAN_BASE_URL ?? "https://etherscan.nex-t1.ai";

export class EtherscanMcpClient extends HttpMcpClient<EtherscanToolName> {
  constructor(options: EtherscanClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_ETHERSCAN_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Etherscan MCP",
      },
    );
  }

  async invoke(
    tool: EtherscanToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<EtherscanToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: EtherscanToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<EtherscanToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultEtherscanClient = new EtherscanMcpClient();
