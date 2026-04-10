import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";

export type HeliusToolName =
  | "helius_get_balance"
  | "helius_get_block_height"
  | "helius_get_slot"
  | "helius_get_latest_blockhash"
  | "helius_get_transaction"
  | "helius_get_account_info"
  | "helius_get_signatures_for_address"
  | "helius_get_multiple_accounts"
  | "helius_get_program_accounts"
  | "helius_get_token_accounts_by_owner"
  | "helius_get_token_supply"
  | "helius_get_token_account_balance"
  | "helius_get_token_accounts"
  | "helius_get_asset"
  | "helius_get_rwa_asset"
  | "helius_get_asset_batch"
  | "helius_get_asset_proof"
  | "helius_get_assets_by_group"
  | "helius_get_assets_by_owner"
  | "helius_get_assets_by_creator"
  | "helius_get_assets_by_authority"
  | "helius_search_assets"
  | "helius_get_signatures_for_asset"
  | "helius_get_nft_editions"
  | "helius_get_minimum_balance_for_rent_exemption"
  | "helius_get_inflation_reward"
  | "helius_get_epoch_info"
  | "helius_get_epoch_schedule"
  | "helius_get_leader_schedule"
  | "helius_get_recent_performance_samples"
  | "helius_get_version"
  | "helius_get_priority_fee_estimate"
  | "helius_poll_transaction_confirmation"
  | "helius_send_jito_bundle"
  | "helius_get_bundle_statuses"
  | "helius_get_fee_for_message"
  | "helius_execute_jupiter_swap";

export type HeliusClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_HELIUS_BASE_URL ?? "https://helius.nex-t1.ai";

export class HeliusMcpClient extends HttpMcpClient<HeliusToolName> {
  constructor(options: HeliusClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_HELIUS_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs,
        maxRetries: options.maxRetries,
        defaultHeaders: options.defaultHeaders,
        name: "Helius MCP",
      },
    );
  }

  async invoke(
    tool: HeliusToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<HeliusToolName>> {
    return super.invoke(tool, args);
  }

  async invokeRaw(
    tool: HeliusToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<HeliusToolName>> {
    return super.invokeRaw(tool, args);
  }
}

export const defaultHeliusClient = new HeliusMcpClient();
