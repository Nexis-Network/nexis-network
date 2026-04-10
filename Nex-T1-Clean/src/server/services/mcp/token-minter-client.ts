import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type TokenMinterToolName =
  | "deployToken"
  | "transferToken"
  | "getTransactionInfo"
  | "getTokenBalance"
  | "getTokenInfo"
  | "getBalance";

export type TokenMinterClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_TOKEN_MINTER_BASE_URL ?? "https://token-minter.nex-t1.ai";

export class TokenMinterMcpClient extends HttpMcpClient<TokenMinterToolName> {
  constructor(options: TokenMinterClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_TOKEN_MINTER_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Token Minter MCP",
      },
    );
  }

  async invoke(
    tool: TokenMinterToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<TokenMinterToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: TokenMinterToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<TokenMinterToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultTokenMinterClient = new TokenMinterMcpClient();
