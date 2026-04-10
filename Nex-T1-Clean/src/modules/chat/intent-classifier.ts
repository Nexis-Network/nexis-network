/**
 * Intent Classification for Lazy Tool Loading
 *
 * Domain: Chat Pipeline
 * Responsibility: Classifies user intent to load only relevant tools,
 *                 reducing context window consumption by 60-80%
 * Depends on: None (pure heuristic classifier)
 * Notes: Uses fast heuristics for immediate classification with optional
 *        LLM-based refinement for ambiguous cases.
 */

import { AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS } from "@/modules/chat/pipeline/runtime-capabilities";

// ============================================================================
// TYPES
// ============================================================================

export type IntentCategory = 
  | "price_check"
  | "wallet_action"
  | "research"
  | "trading"
  | "nft"
  | "defi"
  | "defi_swap"
  | "defi_yield"
  | "defi_liquidity"
  | "general"
  | "task_scheduling"
  | "code_generation"
  | "image_generation"
  | "document_analysis"
  // Legacy categories for backward compatibility with existing modules
  | "greeting"
  | "balance_check"
  | "wallet_create"
  | "trending"
  | "analysis"
  | "complex_task"
  | "market_data"
  | "general_question"
  | "conversation"
  | "smart_contract"
  | "degen_trading";

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "maximum";

export type NexModel = "nex-t0" | "nex-t1" | "nex-t1-max" | "nex-coder" | "degen";

export type NexModelConfig = {
  displayName: string;
  openaiModel: string;
  reasoningEffort: ReasoningEffort;
  description: string;
  maxTokens: number;
  contextWindow: number;
};

export const NEX_MODEL_CONFIG: Record<NexModel, NexModelConfig> = {
  "nex-t0": {
    displayName: "Nex T0",
    openaiModel: "openai/gpt-5.4",
    reasoningEffort: "none", // Fast model - no reasoning overhead
    description: "Fast responses for simple queries",
    maxTokens: 4096,
    contextWindow: 1_050_000,
  },
  "nex-t1": {
    displayName: "Nex T1",
    openaiModel: "openai/gpt-5.4",
    reasoningEffort: "low", // Balanced - light reasoning
    description: "Balanced reasoning for most tasks",
    maxTokens: 32768,
    contextWindow: 1_050_000,
  },
  "nex-t1-max": {
    displayName: "Nex T1 Max",
    openaiModel: "openai/gpt-5.4",
    reasoningEffort: "high", // Thinking model - automatic reasoning
    description: "Deep reasoning for complex analysis",
    maxTokens: 100000,
    contextWindow: 1_050_000,
  },
  "nex-coder": {
    displayName: "Nex Coder",
    openaiModel: "openai/gpt-5.4",
    reasoningEffort: "medium", // Codex - moderate reasoning for code
    description: "Code generation and smart contracts",
    maxTokens: 65536,
    contextWindow: 1_050_000,
  },
  degen: {
    displayName: "Degen Mode",
    openaiModel: "openai/gpt-5.4",
    reasoningEffort: "none", // Fast trading - no reasoning delay
    description: "Fast trading decisions",
    maxTokens: 16384,
    contextWindow: 1_050_000,
  },
};

export function getModelConfig(model: NexModel): NexModelConfig {
  return NEX_MODEL_CONFIG[model];
}

export type IntentClassification = {
  category: IntentCategory;
  confidence: number;
  keywords: string[];
  suggestedTools: string[];
  requiresWallet: boolean;
  requiresApproval: boolean;
  // Extended properties for backward compatibility
  reasoningEffort?: ReasoningEffort;
  fastPathEligible?: boolean;
  model?: NexModel;
};

// ============================================================================
// INTENT PATTERNS
// ============================================================================

type IntentPattern = {
  category: IntentCategory;
  patterns: RegExp[];
  keywords: string[];
  suggestedTools: string[];
  requiresWallet: boolean;
  requiresApproval: boolean;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(message: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) {
    return false;
  }

  const pattern = normalizedKeyword
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join("\\s+");

  return new RegExp(`\\b${pattern}\\b`, "i").test(message);
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    category: "price_check",
    patterns: [
      /\bprice\s*(of|for)?\b/i,
      /\bworth\b/i,
      /\bvalue\b/i,
      /\bhow\s+much\s+(is|are)\b/i,
      /\bmarket\s+cap\b/i,
      /\b(btc|eth|sol|bitcoin|ethereum|solana)\s*price\b/i,
      /\btrending\b/i,
      /\btop\s+(gainers?|losers?)\b/i,
    ],
    keywords: ["price", "worth", "value", "cost", "market cap", "trending", "gainers", "losers"],
    suggestedTools: ["coingecko_trending", "binance_market_data", "dexscreener", "market_trending"],
    requiresWallet: false,
    requiresApproval: false,
  },
  {
    category: "wallet_action",
    patterns: [
      /\bsend\s+(eth|sol|btc|usdc|usdt)\b/i,
      /\btransfer\b/i,
      /\bswap\b/i,
      /\bbridge\b/i,
      /\b(my|check)\s+balance\b/i,
      /\bwallet\s+(balance|holdings|address)\b/i,
      /\bnet\s+worth\b/i,
      /\bholdings?\b/i,
      /\bportfolio\b/i,
      /\bpnl\b/i,
      /\bprofit(?:ability)?\b/i,
      /\bembedded\s+wallets?\b/i,
      /\bwallet_get_(holdings|history|nfts|pnl|transfers|net_worth)\b/i,
      /\bexport\s+private\s+key\b/i,
      /\bsign\s+(message|transaction)\b/i,
    ],
    keywords: [
      "send",
      "transfer",
      "swap",
      "bridge",
      "balance",
      "wallet",
      "sign",
      "holdings",
      "net worth",
      "portfolio",
      "pnl",
      "profitability",
      "embedded wallet",
    ],
    suggestedTools: [
      "agent_wallet_list",
      "evm_wallet_send_asset",
      "wallet_get_holdings",
      "wallet_get_net_worth",
      "wallet_get_pnl",
      "wallet_get_history",
      "wallet_get_transfers",
      "evm_wallet",
      "coinbase_agentkit_wallet",
      "coinbase_agentkit_market",
      "bitcoin_network",
      "solana_agentkit_token",
      "solana_agentkit_misc",
      "mcp_nex__wormhole_supported_routes",
      "mcp_nex__wormhole_route_status",
      "mcp_nex__wormhole_bridge_token",
    ],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "trading",
    patterns: [
      /\bbuy\s+(some|more)?\b/i,
      /\bsell\s+(some|all)?\b/i,
      /\bgo\s+long\b/i,
      /\bgo\s+short\b/i,
      /\blong\s+(?:position|trade|setup)\b/i,
      /\bshort\s+(?:position|trade|setup)\b/i,
      /\blimit\s+order\b/i,
      /\bmarket\s+order\b/i,
      /\bstop\s+loss\b/i,
      /\btake\s+profit\b/i,
      /\bdca\b/i,
    ],
    keywords: ["buy", "sell", "trade", "order", "dca", "long position", "short position"],
    suggestedTools: ["dexscreener", "uniswap_poolspy", "evm_wallet_send_asset", "evm_wallet", "coinbase_agentkit_wallet", "coinbase_agentkit_defi", "solana_agentkit_token", "solana_agentkit_defi"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "degen_trading",
    patterns: [
      /\bpump\.?fun\b/i,
      /\bjupiter\b/i,
      /\braydium\b/i,
      /\borca\b/i,
      /\bmeteora\b/i,
      /\bmemecoin\b/i,
      /\bsolana\s+memecoin\b/i,
      /\blaunch\s+token\b/i,
    ],
    keywords: ["pump.fun", "jupiter", "raydium", "orca", "meteora", "memecoin", "launch token"],
    suggestedTools: ["pumpfun_trader", "pumpfun_data", "pumpfun_metadata", "pumpfun_bonding_status", "helius_solana", "coinbase_agentkit_builder", "solana_agentkit_token", "solana_agentkit_defi", "solana_agentkit_nft"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "research",
    patterns: [
      /\bresearch\b/i,
      /\banalyze\b/i,
      /\bexplain\b/i,
      /\bwhat\s+is\b/i,
      /\bhow\s+does\b/i,
      /\bwhy\s+(is|does|did)\b/i,
      /\bcompare\b/i,
      /\bnews\s+(about|on)\b/i,
      /\bfind\s+(info|information)\b/i,
    ],
    keywords: ["research", "analyze", "explain", "compare", "news", "learn", "understand"],
    suggestedTools: ["exa_web_search", "openai_web_search", "openai_file_search", "market_intelligence"],
    requiresWallet: false,
    requiresApproval: false,
  },
  {
    category: "nft",
    patterns: [
      /\bnft\b/i,
      /\bmint\b/i,
      /\bcollection\b/i,
      /\bopensea\b/i,
      /\brare\b/i,
      /\bfloor\s+price\b/i,
    ],
    keywords: ["nft", "mint", "collection", "floor price", "rare"],
    suggestedTools: ["wallet_get_nfts", "openai_image", "helius_solana", "solana_agentkit_nft"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "defi_swap",
    patterns: [
      /\bswap\b/i,
      /\bexchange\b/i,
      /\bconvert\b/i,
      /\btrade\b/i,
    ],
    keywords: ["swap", "exchange", "convert", "trade"],
    suggestedTools: ["evm_wallet", "helius_solana", "dexscreener", "uniswap_poolspy", "mcp_nex__defi_swap_quote_structured", "pumpfun_trader", "solana_agentkit_token", "solana_agentkit_defi"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "defi_yield",
    patterns: [
      /\bstake\b/i,
      /\byield\b/i,
      /\bfarm\b/i,
      /\bapy\b/i,
      /\btvl\b/i,
      /\bprotocol\b/i,
      /\blend\b/i,
      /\bborrow\b/i,
      /\bearn\b/i,
      /\bdeposit\b/i,
      /\bwithdraw\b/i,
    ],
    keywords: ["stake", "yield", "farm", "apy", "tvl", "lend", "borrow", "earn", "deposit"],
    suggestedTools: ["defi_llama", "mcp_nex__aave_user_positions", "evm_wallet", "blocknative_gas", "solana_agentkit_defi"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "defi_liquidity",
    patterns: [
      /\bliquidity\b/i,
      /\bpool\b/i,
      /\ballocate\b/i,
      /\bposition\b/i,
      /\blp\b/i,
      /\bprovide\b/i,
    ],
    keywords: ["liquidity", "pool", "position", "lp", "provide"],
    suggestedTools: ["uniswap_poolspy", "dexscreener", "evm_wallet", "defi_llama", "blocknative_gas", "solana_agentkit_defi"],
    requiresWallet: true,
    requiresApproval: true,
  },
  {
    category: "task_scheduling",
    patterns: [
      /\bschedule\b/i,
      /\bremind\s+me\b/i,
      /\bevery\s+(day|hour|week)\b/i,
      /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i,
      /\brecurring\b/i,
      /\bautomate\b/i,
      /\bwhen\s+.+\s+then\b/i,
    ],
    keywords: ["schedule", "remind", "recurring", "automate", "trigger", "when"],
    suggestedTools: ["task_scheduler"],
    requiresWallet: false,
    requiresApproval: false,
  },
  {
    category: "code_generation",
    patterns: [
      /\bwrite\s+(code|a?\s*function|script)\b/i,
      /\bcode\s+(for|to)\b/i,
      /\bgenerate\s+(code|script)\b/i,
      /\b(build|create|make|generate)\s+.+\b(html|jsx|tsx|react|component|web\s+page|landing\s+page)\b/i,
      /\b(html|jsx|tsx)\s+(artifact|component|page)\b/i,
      /\bsolidity\b/i,
      /\bsmart\s+contract\b/i,
      /\bhelp\s+me\s+code\b/i,
      /\bdebug\b/i,
    ],
    keywords: ["code", "function", "script", "solidity", "contract", "debug", "html", "jsx", "tsx", "react", "component"],
    suggestedTools: [
      "e2b_write_file",
      "e2b_read_file",
      "e2b_list_dir",
      "e2b_npm_install",
      "e2b_npm_run",
      "e2b_get_preview_url",
      "emit_artifact",
      "e2b_code_interpreter",
    ],
    requiresWallet: false,
    requiresApproval: false,
  },
  {
    category: "image_generation",
    patterns: [
      /\b(generate|create|make)\s+(an?\s+)?image\b/i,
      /\bdraw\b/i,
      /\billustrate\b/i,
      /\bpicture\s+of\b/i,
      /\bvisualize\b/i,
      /\bart\s+(of|for)\b/i,
    ],
    keywords: ["image", "draw", "illustrate", "picture", "visualize", "art"],
    suggestedTools: ["openai_image"],
    requiresWallet: false,
    requiresApproval: false,
  },
  {
    category: "document_analysis",
    patterns: [
      /\b(analyze|read|summarize)\s+(this|the|my)?\s*(document|pdf|file)\b/i,
      /\bwhat\s+does\s+(this|the)\s+(document|pdf|file)\s+say\b/i,
      /\bextract\s+(from|data)\b/i,
      /\bupload(ed)?\s+(file|document)\b/i,
    ],
    keywords: ["analyze", "document", "pdf", "file", "summarize", "extract"],
    suggestedTools: ["openai_file_search", "openai_code_interpreter"],
    requiresWallet: false,
    requiresApproval: false,
  },
];

// Default/general intent when no specific pattern matches
const DEFAULT_CLASSIFICATION: IntentClassification = {
  category: "general",
  confidence: 0.5,
  keywords: [],
  suggestedTools: ["exa_web_search", "coingecko_trending"],
  requiresWallet: false,
  requiresApproval: false,
  };

// ============================================================================
// CLASSIFIER
// ============================================================================

/**
 * Classifies user intent based on message content using fast heuristics.
 * Returns the most likely intent category with confidence score.
 *
 * @param message - The user's message to classify
 * @returns IntentClassification with category, confidence, and suggested tools
 */
export async function classifyIntent(message: string): Promise<IntentClassification> {
  if (!message || typeof message !== "string") {
    return DEFAULT_CLASSIFICATION;
  }

  const normalizedMessage = message.toLowerCase().trim();

  // Track matches for each category
  const categoryScores: Map<IntentCategory, { score: number; pattern: IntentPattern }> = new Map();

  for (const pattern of INTENT_PATTERNS) {
    let matchScore = 0;
    const matchedKeywords: string[] = [];

    // Check regex patterns (higher weight)
    for (const regex of pattern.patterns) {
      if (regex.test(normalizedMessage)) {
        matchScore += 2;
      }
    }

    // Check keywords (lower weight)
    for (const keyword of pattern.keywords) {
      if (matchesKeyword(normalizedMessage, keyword)) {
        matchScore += 1;
        matchedKeywords.push(keyword);
      }
    }

    if (matchScore > 0) {
      const existing = categoryScores.get(pattern.category);
      if (!existing || matchScore > existing.score) {
        categoryScores.set(pattern.category, { score: matchScore, pattern });
      }
    }
  }

  // Find highest scoring category
  let bestMatch: { category: IntentCategory; score: number; pattern: IntentPattern } | null = null;

  for (const [category, data] of categoryScores.entries()) {
    if (!bestMatch || data.score > bestMatch.score) {
      bestMatch = { category, ...data };
    }
  }

  if (!bestMatch) {
    return DEFAULT_CLASSIFICATION;
  }

  // Calculate confidence based on score
  // Score 1-2: Low confidence (0.4-0.6)
  // Score 3-4: Medium confidence (0.6-0.8)
  // Score 5+: High confidence (0.8-0.95)
  const confidence = Math.min(0.95, 0.4 + (bestMatch.score * 0.1));

  // Extract matched keywords for transparency
  const matchedKeywords = bestMatch.pattern.keywords.filter((k) =>
    matchesKeyword(normalizedMessage, k)
  );

  const fastPathEligible = [
    "greeting",
    "price_check",
    "balance_check",
    "wallet_create",
    "trending",
  ].includes(bestMatch.category);
  
  return {
    category: bestMatch.category,
    confidence,
    keywords: matchedKeywords,
    suggestedTools: bestMatch.pattern.suggestedTools,
    requiresWallet: bestMatch.pattern.requiresWallet,
    requiresApproval: bestMatch.pattern.requiresApproval,
    fastPathEligible,
  };
}

// ============================================================================
// TOOL SELECTION
// ============================================================================

/**
 * Maps intent categories to required tool sets for lazy loading.
 * Only loads tools that are likely needed for the classified intent.
 */
export const INTENT_TOOL_MAP: Record<IntentCategory, string[]> = {
  price_check: [
    "market_price_chart",
    "market_search",
    "coingecko_trending",
    "binance_market_data",
    "dexscreener",
    "market_trending",
    "market_gainers",
    "market_losers",
  ],
  wallet_action: [
    "agent_wallet_list",
    "evm_wallet_send_asset",
    "evm_wallet",
    "bitcoin_network",
    "helius_solana",
    "mcp_nex__wormhole_supported_chains",
    "mcp_nex__wormhole_supported_routes",
    "mcp_nex__wormhole_route_status",
    "mcp_nex__wormhole_transfer_status",
    "mcp_nex__wormhole_bridge_token",
    "solana_agentkit_token",
    "solana_agentkit_misc",
    "wallet_get_holdings",
    "wallet_get_history",
    "wallet_get_net_worth",
    "wallet_get_pnl",
    "wallet_get_transfers",
    "blocknative_gas",
    "bsc_chain",
    "help_create_wallet",
    "simulate_transaction",
    "audit_contract",
    "governance_inspector",
  ],
  trading: ["evm_wallet_send_asset", "evm_wallet", "helius_solana", "solana_agentkit_token", "solana_agentkit_defi", "dexscreener", "uniswap_poolspy", "market_intelligence", "blocknative_gas", "bsc_chain", "mcp_nex__wormhole_route_status", "mcp_nex__wormhole_bridge_token"],
  research: ["exa_web_search", "openai_web_search", "openai_file_search", "openai_code_interpreter", "market_intelligence"],
  nft: ["wallet_get_nfts", "openai_image", "helius_solana", "solana_agentkit_nft"],
  defi: ["evm_wallet", "helius_solana", "solana_agentkit_defi", "solana_agentkit_token", "defi_llama", "uniswap_poolspy", "dexscreener", "market_intelligence", "blocknative_gas", "bsc_chain"],
  defi_swap: ["evm_wallet", "helius_solana", "solana_agentkit_token", "solana_agentkit_defi", "dexscreener", "uniswap_poolspy", "mcp_nex__defi_swap_quote_structured", "mcp_nex__wormhole_supported_routes", "mcp_nex__wormhole_route_status", "mcp_nex__wormhole_bridge_token", "pumpfun_trader"],
  defi_yield: ["defi_llama", "mcp_nex__aave_user_positions", "evm_wallet", "blocknative_gas", "solana_agentkit_defi"],
  defi_liquidity: ["uniswap_poolspy", "dexscreener", "evm_wallet", "defi_llama", "blocknative_gas", "solana_agentkit_defi"],
  task_scheduling: ["task_scheduler"],
  code_generation: [
    "e2b_write_file",
    "e2b_read_file",
    "e2b_list_dir",
    "e2b_npm_install",
    "e2b_npm_run",
    "e2b_get_preview_url",
    "emit_artifact",
    "openai_code_interpreter",
    "e2b_code_interpreter",
  ],
  image_generation: ["openai_image"],
  document_analysis: ["openai_file_search", "openai_code_interpreter"],
  general: [
    "exa_web_search",
    "openai_web_search",
    "coingecko_trending",
    "help_create_wallet",
    "emit_artifact",
    "working_memory_todos",
    "updateWorkingMemory",
  ],
  // Legacy categories for backward compatibility
  greeting: ["coingecko_trending"],
  balance_check: ["evm_wallet", "bitcoin_network"],
  wallet_create: ["evm_wallet", "help_create_wallet"],
  trending: ["coingecko_trending", "market_trending", "dexscreener"],
  analysis: ["exa_web_search", "openai_web_search", "openai_file_search", "market_intelligence", "defi_llama"],
  complex_task: ["exa_web_search", "openai_web_search", "openai_code_interpreter", "market_intelligence", "defi_llama"],
  market_data: [
    "market_price_chart",
    "market_search",
    "market_snapshot",
    "coingecko_trending",
    "binance_market_data",
    "dexscreener",
  ],
  general_question: ["exa_web_search", "openai_web_search"],
  conversation: [],
  smart_contract: [
    "openai_code_interpreter",
    ...AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS,
    "etherscan",
  ],
  degen_trading: [
    "helius_solana",
    "solana_agentkit_token",
    "solana_agentkit_defi",
    "solana_agentkit_nft",
    "solana_agentkit_misc",
    "pumpfun_trader",
    "pumpfun_data",
    "pumpfun_chat",
    "pumpfun_new_tokens",
    "pumpfun_pairs",
    "pumpfun_prices",
    "pumpfun_metadata",
    "pumpfun_bonding_tokens",
    "pumpfun_graduated_tokens",
    "pumpfun_bonding_status",
    "pumpfun_swaps",
    "sol_pairs_by_token",
    "sol_pair_stats",
    "sol_ohlcv_by_pair",
    "sol_token_prices_batch",
    "dexscreener",
    "market_intelligence",
  ],
};

/**
 * Selects tools based on intent classification.
 * This enables lazy loading to reduce context window consumption.
 *
 * @param classification - The intent classification result
 * @param fullToolset - All available tools
 * @returns Filtered toolset containing only relevant tools
 */
export function selectToolsForIntent<T>(
  classification: IntentClassification,
  fullToolset: Record<string, T>
): Record<string, T> {
  const requiredTools = INTENT_TOOL_MAP[classification.category] ?? [];

  // Always include general tools as fallback
  const generalTools = INTENT_TOOL_MAP.general;
  const allRequiredTools = new Set([...requiredTools, ...generalTools]);

  const selectedTools: Record<string, T> = {};

  for (const toolId of allRequiredTools) {
    if (toolId in fullToolset) {
      selectedTools[toolId] = fullToolset[toolId];
    }
  }

  // If no tools matched, return a subset of the original toolset
  if (Object.keys(selectedTools).length === 0) {
    // Return first 10 tools as fallback
    const entries = Object.entries(fullToolset).slice(0, 10);
    return Object.fromEntries(entries);
  }

  return selectedTools;
}

/**
 * Gets the minimum required tools for a classification.
 * Used for estimating context window usage.
 */
export function getMinimumToolCount(classification: IntentClassification): number {
  const tools = INTENT_TOOL_MAP[classification.category] ?? [];
  return tools.length;
}

/**
 * Checks if an intent requires human approval.
 */
export function requiresHumanApproval(classification: IntentClassification): boolean {
  return classification.requiresApproval;
}

/**
 * Checks if an intent requires wallet access.
 */
export function requiresWalletAccess(classification: IntentClassification): boolean {
  return classification.requiresWallet;
}
