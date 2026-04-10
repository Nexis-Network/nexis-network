import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type BitcoinToolName =
  | "create_wallet"
  | "import_wallet"
  | "get_balance"
  | "get_address"
  | "send_bitcoin"
  | "sign_transaction"
  | "decode_transaction"
  | "create_invoice"
  | "generate_key"
  | "validate_address"
  | "decode_tx"
  | "get_latest_block"
  | "get_transaction"
  | "decode_invoice"
  | "pay_invoice";

export type BitcoinClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_BITCOIN_BASE_URL ?? "https://bitcoin.nex-t1.ai";

export class BitcoinMcpClient extends HttpMcpClient<BitcoinToolName> {
  constructor(options: BitcoinClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_BITCOIN_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Bitcoin MCP",
      },
    );
  }

  async invoke(
    tool: BitcoinToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BitcoinToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: BitcoinToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BitcoinToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultBitcoinClient = new BitcoinMcpClient();
