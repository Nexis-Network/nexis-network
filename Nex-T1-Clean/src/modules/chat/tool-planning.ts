import type { ToolCategory } from "@/modules/ai/metaprompts";

import { getToolCategory, requiresApproval } from "@/modules/chat/tool-approval-policy";

export type ToolPlanningMode = "fast" | "standard" | "deep";

export type ToolPlan = {
  toolName: string;
  intent: string;
  category: ToolCategory | "unknown";
  mode: ToolPlanningMode;
  reasoning: string;
  approvalRequired: boolean;
  estimatedDurationMs: number;
};

export const DEFAULT_PRIORITY_TOOL_NAMES = [
  "evm_wallet_send_asset",
  "evm_wallet",
  "bitcoin_network",
  "coingecko_trending",
  "dexscreener",
  "binance_market_data",
] as const;

const SECRET_PREFIXES = [
  "sk-",
  "sk_",
  "rk-",
  "rk_",
  "pk-",
  "pk_",
  "vck_",
  "vcb_",
  "sess-",
  "sess_",
];

const maskSecrets = (input: string) =>
  SECRET_PREFIXES.reduce(
    (acc, prefix) =>
      acc.replace(
        new RegExp(`${prefix}[A-Za-z0-9\\-_]{6,}`, "gi"),
        `${prefix}***redacted***`,
      ),
    input,
  );

function estimateDuration(
  toolName: string,
  category: ToolCategory | "unknown",
  priorityTools: Set<string>,
): number {
  const durationMap: Record<ToolCategory | "unknown", number> = {
    wallet: 1500,
    defi: 2000,
    market: 800,
    research: 3000,
    solana: 1500,
    onchain: 1200,
    mcp: 1200,
    unknown: 1500,
  };

  if (priorityTools.has(toolName)) {
    return Math.round(durationMap[category] * 0.5);
  }

  return durationMap[category];
}

function generateToolIntent(toolName: string, input: UntypedJson): string {
  const inputObj = input as Record<string, UntypedJson> | null;
  const command =
    inputObj && typeof inputObj.command === "string"
      ? String(inputObj.command)
      : "";

  if (toolName === "evm_wallet" || toolName === "cryptowallet_evm") {
    if (command === "wallet_create_random") return "Create new EVM wallet";
    if (command === "wallet_get_balance") return "Check EVM wallet balance";
    if (command === "wallet_get_address") return "Get EVM wallet address";
    if (command === "wallet_send_transaction") return "Send EVM transaction";
    if (command.startsWith("wallet_sign_")) return "Sign EVM payload";
    if (command.startsWith("provider_") || command.startsWith("network_")) {
      return "Query EVM network data";
    }
    return command ? `EVM wallet: ${command}` : "EVM wallet operation";
  }

  if (toolName === "evm_wallet_send_asset") {
    return "Send managed EVM transfer";
  }

  if (toolName === "bitcoin_network") {
    if (command === "create_wallet") return "Create Bitcoin wallet";
    if (command === "get_balance") return "Check BTC balance";
    if (command === "get_address") return "Get BTC address";
    if (command === "send_bitcoin") return "Send BTC transaction";
    if (command.includes("invoice")) return "Lightning invoice";
    return command ? `Bitcoin: ${command}` : "Bitcoin operation";
  }

  if (toolName === "coingecko_trending" || toolName === "cryptorank") {
    return "Fetch trending tokens";
  }
  if (toolName === "exa_web_search" || toolName === "openai_web_search") {
    const query = inputObj?.query ? String(inputObj.query).slice(0, 50) : "web";
    return `Search: ${query}`;
  }
  if (toolName.startsWith("pumpfun_")) {
    return `Pump.fun: ${toolName.replace("pumpfun_", "")}`;
  }

  return toolName.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

function getPlanningMode(
  toolName: string,
  category: ToolCategory | "unknown",
  priorityTools: Set<string>,
): ToolPlanningMode {
  if (priorityTools.has(toolName)) return "fast";
  if (category === "research") return "deep";

  if (category === "wallet") {
    if (
      toolName === "evm_wallet" ||
      toolName === "cryptowallet_evm" ||
      toolName === "bitcoin_network"
    ) {
      return "standard";
    }
    if (toolName.includes("send") || toolName.includes("sign")) {
      return "standard";
    }
    return "fast";
  }
  if (category === "defi") return "standard";
  if (category === "solana") return "standard";
  if (category === "onchain" || category === "mcp") return "standard";

  return "fast";
}

export function buildToolPlan(
  toolName: string,
  input: UntypedJson,
  priorityTools: Set<string>,
): ToolPlan {
  const category = getToolCategory(toolName);
  const mode = getPlanningMode(toolName, category, priorityTools);
  const approvalRequired = requiresApproval(toolName, input);

  let reasoning: string;
  switch (mode) {
    case "fast":
      reasoning = "Direct execution - atomic action";
      break;
    case "standard":
      reasoning = approvalRequired
        ? "Validation required - checking parameters"
        : "Standard flow - verify inputs";
      break;
    case "deep":
      reasoning = "Multi-step analysis - gathering data";
      break;
  }

  return {
    toolName,
    intent: generateToolIntent(toolName, input),
    category,
    mode,
    reasoning,
    approvalRequired,
    estimatedDurationMs: estimateDuration(toolName, category, priorityTools),
  };
}

export function formatToolPlanText(plan: ToolPlan): string {
  const lines = [
    `**Intent**: ${plan.intent}`,
    `**Tool**: ${plan.toolName} (${plan.category})`,
    `**Mode**: ${plan.mode.toUpperCase()}`,
    `**Reasoning**: ${plan.reasoning}`,
  ];

  if (plan.approvalRequired) {
    lines.push("**Approval**: Required");
  }

  return lines.join("\n");
}

export function formatToolNameForUser(toolName: string): string {
  const friendlyNames: Record<string, string> = {
    evm_wallet: "EVM wallet",
    evm_wallet_send_asset: "EVM transfer",
    cryptowallet_evm: "EVM wallet",
    bitcoin_network: "Bitcoin/Lightning",
    agent_wallet_list: "wallet list",
    wallet_get_holdings: "holdings",
    wallet_get_history: "history",
    wallet_get_transfers: "transfers",
    wallet_get_net_worth: "net worth",
    market_trending: "market trends",
    market_gainers: "top gainers",
    market_losers: "top losers",
    market_filtered_tokens: "token screener",
    exa_web_search: "web search",
    openai_file_search: "file search",
    wallet_create_random: "wallet creation",
    wallet_get_balance: "balance check",
    wallet_get_address: "address lookup",
    wallet_send_transaction: "transaction",
    wallet_bridge_assets: "bridge transfer",
    defi_swap_quote: "swap quote",
    defi_swap_quote_structured: "swap analysis",
    coingecko_trending: "trending data",
    dexscreener: "DEX data",
    binance_market_data: "market data",
    market_intelligence: "market analysis",
    openai_web_search: "web search",
    openai_code_interpreter: "calculations",
    pumpfun_trader: "Pump.fun trade",
    pumpfun_data: "Pump.fun data",
    helius_solana: "Solana data",
  };

  return friendlyNames[toolName] ?? toolName.replace(/_/g, " ");
}

export function summarizeResultForUser(
  toolName: string,
  result: UntypedJson,
): string {
  if (!result) {
    return `Completed ${formatToolNameForUser(toolName)}`;
  }

  const obj = result as Record<string, UntypedJson>;

  if (
    (toolName === "evm_wallet" || toolName === "cryptowallet_evm") &&
    typeof obj.command === "string"
  ) {
    const command = obj.command;
    const approvalState =
      typeof obj.approvalState === "string" ? obj.approvalState : null;
    if (approvalState === "awaiting_approval") {
      return "Awaiting approval";
    }
    const toolResult = (obj.toolResult ?? obj.response?.toolResult) as
      | Record<string, UntypedJson>
      | undefined;
    if (command === "wallet_create_random") {
      const address =
        typeof toolResult?.address === "string" ? toolResult.address : null;
      return address
        ? `Created wallet ${address.slice(0, 6)}...${address.slice(-4)}`
        : "Wallet created";
    }
    if (command === "wallet_get_balance") {
      const balance = toolResult?.balance ?? toolResult?.formattedBalance;
      return balance
        ? `Balance: ${String(balance).slice(0, 32)}`
        : "Balance fetched";
    }
  }

  if (obj.address && typeof obj.address === "string") {
    const addr = obj.address;
    return `Created wallet ${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (obj.balance !== undefined) {
    return `Balance: ${obj.balance} ${obj.symbol ?? ""}`.trim();
  }

  if (obj.price !== undefined || obj.usd !== undefined) {
    const price = obj.price ?? obj.usd;
    return `Price: $${Number(price).toLocaleString()}`;
  }

  if (obj.toAmount !== undefined && obj.fromAmount !== undefined) {
    return `Quote: ${obj.fromAmount} → ${obj.toAmount}`;
  }

  if (obj.results && Array.isArray(obj.results)) {
    return `Found ${obj.results.length} results`;
  }

  if (obj.coins && Array.isArray(obj.coins)) {
    return `Found ${obj.coins.length} trending tokens`;
  }

  if (obj.txHash || obj.transactionHash || obj.hash) {
    const hash = (obj.txHash ?? obj.transactionHash ?? obj.hash) as string;
    return `Transaction: ${hash.slice(0, 10)}...`;
  }

  return `Completed ${formatToolNameForUser(toolName)}`;
}

export const summarizeInput = (input: UntypedJson): string | undefined => {
  if (!input) {
    return undefined;
  }
  if (typeof input === "string") {
    return trimSummary(input);
  }
  try {
    return trimSummary(JSON.stringify(input));
  } catch {
    return undefined;
  }
};

const trimSummary = (value: string) => {
  if (!value) {
    return value;
  }
  const sanitized = maskSecrets(value);
  return sanitized.length > 200 ? `${sanitized.slice(0, 197)}…` : sanitized;
};
