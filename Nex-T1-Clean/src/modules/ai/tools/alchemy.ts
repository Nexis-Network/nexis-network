import { createMcpCommandTool } from "./mcp-tool-factory";
import { AlchemyMcpClient, defaultAlchemyClient } from "@/server/services/mcp/alchemy-client";

const ALCHEMY_TOOL_NAMES = [
  "get_nfts_for_owner",
  "get_nft_metadata",
  "get_nft_sales",
  "get_contracts_for_owner",
  "get_floor_price",
  "get_owners_for_nft",
  "get_nfts_for_contract",
  "get_transfers_for_contract",
  "get_transfers_for_owner",
  "get_token_balances",
  "get_token_metadata",
  "get_tokens_for_owner",
  "get_asset_transfers",
  "get_transaction_receipts",
  "get_block_number",
  "get_block_with_transactions",
  "get_transaction",
  "resolve_ens",
  "lookup_address",
  "estimate_gas_price",
  "subscribe",
  "unsubscribe",
] as const;

export const alchemyTool = createMcpCommandTool({
  name: "alchemy",
  description:
    "Tap into Alchemy SDK methods for NFTs, tokens, transactions, ENS resolution, and websocket subscriptions.",
  commandNames: ALCHEMY_TOOL_NAMES,
  client: defaultAlchemyClient,
  clientFactory: () => new AlchemyMcpClient(),
});
