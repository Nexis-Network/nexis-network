import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
  type McpTransport,
} from "./base-client";

export type EvmWalletToolName =
  | "wallet_provider_set"
  | "wallet_create_random"
  | "wallet_create_mnemonic_phrase"
  | "wallet_from_private_key"
  | "wallet_from_mnemonic"
  | "wallet_from_encrypted_json"
  | "wallet_encrypt"
  | "wallet_get_address"
  | "wallet_get_public_key"
  | "wallet_get_private_key"
  | "wallet_get_mnemonic"
  | "wallet_get_balance"
  | "wallet_get_chain_id"
  | "wallet_get_gas_price"
  | "wallet_get_transaction_count"
  | "wallet_call"
  | "wallet_send_transaction"
  | "wallet_sign_transaction"
  | "wallet_populate_transaction"
  | "wallet_sign_message"
  | "wallet_sign_typed_data"
  | "wallet_verify_message"
  | "wallet_verify_typed_data"
  | "wallet_bridge_assets"
  | "wallet_swap_tokens"
  | "provider_get_block"
  | "provider_get_transaction"
  | "provider_get_transaction_receipt"
  | "provider_get_code"
  | "provider_get_storage_at"
  | "provider_estimate_gas"
  | "provider_get_logs"
  | "provider_get_ens_resolver"
  | "provider_lookup_address"
  | "provider_resolve_name"
  | "network_get_network"
  | "network_get_block_number"
  | "network_get_fee_data";

export type EvmWalletClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_EVM_WALLET_BASE_URL ??
  process.env.MCP_EVM_WALLET_URL ??
  "https://mcp.nex-t1.ai/mcp";
const DEFAULT_TIMEOUT =
  Number.parseInt(process.env.MCP_EVM_WALLET_TIMEOUT_MS ?? "", 10) || 15_000;
const DEFAULT_RETRIES =
  Number.parseInt(process.env.MCP_EVM_WALLET_RETRY_COUNT ?? "", 10) || 2;

const detectTransport = (): McpTransport => {
  const envTransport = process.env.MCP_EVM_WALLET_TRANSPORT?.toLowerCase();
  if (envTransport === "httpstream" || envTransport === "sse") {
    return "streamable-http";
  }
  if (envTransport === "http" || envTransport === "streamable-http") {
    return envTransport as McpTransport;
  }

  return "http";
};

export class EvmWalletMcpClient extends HttpMcpClient<EvmWalletToolName> {
  constructor(options: EvmWalletClientOptions = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const transport = options.transport ?? detectTransport();

    super({
      baseUrl,
      apiKey: options.apiKey ?? process.env.MCP_EVM_WALLET_API_KEY,
      requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_RETRIES,
      defaultHeaders: options.defaultHeaders,
      name: "EVM Wallet MCP",
      transport,
      sseEndpoint: "/sse",
    });
  }

  async invoke(
    tool: EvmWalletToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<EvmWalletToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: EvmWalletToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<EvmWalletToolName>> {
    return super.invokeRaw(tool, args);
  }

  async setProvider(providerURL: string) {
    return this.invokeRaw("wallet_provider_set", { providerURL });
  }
}

export const defaultEvmWalletMcpClient = new EvmWalletMcpClient();
