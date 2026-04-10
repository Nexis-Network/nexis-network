import { isProbablyValueMovingToolName } from "@/server/mcp/ai-sdk-mcp-tools";
import {
  getToolRiskLevel,
  isApprovalRequiredTool,
  isSimulateOnlyTool,
} from "@/modules/ai/tool-risk-registry";
import {
  TOOL_CATEGORIES,
  type ToolCategory,
} from "@/modules/ai/metaprompts";

export function getToolCategory(toolName: string): ToolCategory | "unknown" {
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if ((tools as readonly string[]).includes(toolName)) {
      return category as ToolCategory;
    }
  }

  if (
    toolName === "evm_wallet" ||
    toolName === "evm_wallet_send_asset" ||
    toolName === "cryptowallet_evm" ||
    toolName === "bitcoin_network"
  ) {
    return "wallet";
  }
  if (toolName.startsWith("wallet_") || toolName.startsWith("provider_")) {
    return "wallet";
  }
  if (toolName.startsWith("defi_") || toolName.startsWith("aave_")) {
    return "defi";
  }
  if (
    toolName.startsWith("coingecko_") ||
    toolName.startsWith("binance_") ||
    toolName.startsWith("market_")
  ) {
    return "market";
  }
  if (
    toolName.startsWith("openai_") ||
    toolName.startsWith("exa_") ||
    toolName.startsWith("web_search")
  ) {
    return "research";
  }
  if (
    toolName.startsWith("pumpfun_") ||
    toolName.startsWith("pumpswap_") ||
    toolName.startsWith("helius_") ||
    toolName.startsWith("sol_")
  ) {
    return "solana";
  }
  if (toolName.startsWith("mcp_")) {
    return "mcp";
  }
  return "unknown";
}

export function requiresApproval(toolName: string, input: UntypedJson): boolean {
  if (isApprovalRequiredTool(toolName)) {
    return true;
  }

  if (isSimulateOnlyTool(toolName)) {
    return false;
  }

  const inputObj = input as Record<string, UntypedJson> | null;

  const argsArrayToRecord = (
    args: UntypedJson,
  ): Record<string, UntypedJson> => {
    if (!Array.isArray(args)) return {};
    const out: Record<string, UntypedJson> = {};
    for (const entry of args) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, UntypedJson>;
      const key = typeof rec.key === "string" ? rec.key : null;
      if (!key) continue;
      out[key] = rec.value;
    }
    return out;
  };

  if (
    (toolName === "evm_wallet" || toolName === "cryptowallet_evm") &&
    inputObj
  ) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const evmApproval = new Set([
      "wallet_send_transaction",
      "wallet_sign_transaction",
      "wallet_sign_message",
      "wallet_sign_typed_data",
      "wallet_encrypt",
      "wallet_get_private_key",
      "wallet_get_mnemonic",
      "wallet_from_private_key",
      "wallet_from_mnemonic",
      "wallet_from_encrypted_json",
    ]);
    if (evmApproval.has(command)) return true;

    const args = argsArrayToRecord(inputObj.args);
    const amountUsd = Number(args.amountUsd ?? args.valueUsd ?? 0);
    if (Number.isFinite(amountUsd) && amountUsd > 1000) return true;
  }

  if (toolName === "bitcoin_network" && inputObj) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const btcApproval = new Set([
      "send_bitcoin",
      "sign_transaction",
      "create_invoice",
      "pay_invoice",
    ]);
    if (btcApproval.has(command)) return true;
  }

  if (toolName === "pumpfun_trader" && inputObj) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const pumpfunApproval = new Set(["create_and_buy", "buy", "sell"]);
    if (pumpfunApproval.has(command)) return true;
  }

  if (toolName === "token_minter" && inputObj) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const tokenMinterApproval = new Set(["deployToken", "transferToken"]);
    if (tokenMinterApproval.has(command)) return true;
  }

  if (toolName === "helius_solana" && inputObj) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const solanaApproval = new Set([
      "helius_execute_jupiter_swap",
      "helius_send_jito_bundle",
    ]);
    if (solanaApproval.has(command)) return true;
  }

  if (toolName === "bsc_chain" && inputObj) {
    const command =
      typeof inputObj.command === "string" ? inputObj.command : "";
    const readOnly = new Set([
      "Get_Wallet_Info",
      "Token_Security_Check",
      "QueryMemeTokenDetails",
      "View_PancakeSwap_Positions",
    ]);
    if (command && !readOnly.has(command)) return true;
  }

  if (toolName.startsWith("mcp_")) {
    if (toolName.startsWith("mcp_moralis__")) return false;

    const [, rawToolName] = toolName.split("__", 2);
    const serverToolName = rawToolName ?? toolName;
    if (isProbablyValueMovingToolName(serverToolName)) return true;

    if (
      /private_key|mnemonic|seed_phrase|encrypted_json|(^|_)encrypt(_|$)/i.test(
        serverToolName,
      )
    ) {
      return true;
    }
  }

  if (inputObj) {
    const amount = Number(inputObj.amount ?? inputObj.value ?? 0);
    if (
      amount > 1000 ||
      (inputObj.amountUsd && Number(inputObj.amountUsd) > 1000)
    ) {
      return true;
    }
  }

  const alwaysApprove = new Set(["wallet_send_transaction", "wallet_sign_transaction"]);

  return alwaysApprove.has(toolName) || getToolRiskLevel(toolName) === "approval_required";
}
