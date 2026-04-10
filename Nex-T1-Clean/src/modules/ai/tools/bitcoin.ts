import { createMcpCommandTool } from "./mcp-tool-factory";
import { BitcoinMcpClient, defaultBitcoinClient } from "@/server/services/mcp/bitcoin-client";

const BITCOIN_TOOL_NAMES = [
  "create_wallet",
  "import_wallet",
  "get_balance",
  "get_address",
  "send_bitcoin",
  "sign_transaction",
  "decode_transaction",
  "create_invoice",
  "generate_key",
  "validate_address",
  "decode_tx",
  "get_latest_block",
  "get_transaction",
  "decode_invoice",
  "pay_invoice",
] as const;

export const bitcoinTool = createMcpCommandTool({
  name: "bitcoin",
  description:
    "Perform Bitcoin and Lightning operations including key generation, transaction decoding, and invoice handling.",
  commandNames: BITCOIN_TOOL_NAMES,
  client: defaultBitcoinClient,
  clientFactory: () => new BitcoinMcpClient(),
});
