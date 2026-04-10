import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type AlchemyToolName =
  | "get_nfts_for_owner"
  | "get_nft_metadata"
  | "get_nft_sales"
  | "get_contracts_for_owner"
  | "get_floor_price"
  | "get_owners_for_nft"
  | "get_nfts_for_contract"
  | "get_transfers_for_contract"
  | "get_transfers_for_owner"
  | "get_token_balances"
  | "get_token_metadata"
  | "get_tokens_for_owner"
  | "get_asset_transfers"
  | "get_transaction_receipts"
  | "get_block_number"
  | "get_block_with_transactions"
  | "get_transaction"
  | "resolve_ens"
  | "lookup_address"
  | "estimate_gas_price"
  | "subscribe"
  | "unsubscribe";

export type AlchemyClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_ALCHEMY_BASE_URL ?? "https://alchemy.nex-t1.ai";

export class AlchemyMcpClient extends HttpMcpClient<AlchemyToolName> {
  constructor(options: AlchemyClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_ALCHEMY_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Alchemy MCP",
      },
    );
  }

  async invoke(
    tool: AlchemyToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<AlchemyToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: AlchemyToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<AlchemyToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultAlchemyClient = new AlchemyMcpClient();
