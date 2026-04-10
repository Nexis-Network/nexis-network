import type {
  ClassificationCategory,
  ClassificationComplexity,
  ClassificationModelTier,
  ClassificationRoute,
} from "./routing-classification";

/**
 * High-level grouping to support heuristic routing and analytics aggregation.
 */
export type CategorySuperGroup =
  | "general"
  | "support"
  | "life_support"
  | "product"
  | "technical"
  | "blockchain_support"
  | "trading"
  | "investing"
  | "research"
  | "developer"
  | "analyst"
  | "strategist"
  | "market_research"
  | "other";

export type CategoryPolicy = {
  route: ClassificationRoute;
  /**
   * Model tier to attempt first when confidence is healthy.
   */
  defaultTier: ClassificationModelTier;
  /**
   * Tier to escalate to if the request is complex or classification confidence is low.
   */
  complexTier?: ClassificationModelTier;
  /**
   * Threshold below which we should fall back to safer routing/model choices.
   */
  confidenceFloor?: number;
  /**
   * Expected baseline complexity for the category; used when heuristics disagree.
   */
  baselineComplexity: ClassificationComplexity;
  superGroup: CategorySuperGroup;
};

export const CATEGORY_POLICIES: Record<ClassificationCategory, CategoryPolicy> = {
  general_chat: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    confidenceFloor: 0.5,
    baselineComplexity: "simple",
    superGroup: "general",
  },
  general_support: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "support",
  },
  product_support: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "product",
  },
  technical_support: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "technical",
  },
  blockchain_support: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "blockchain_support",
  },
  web3_transactions: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "blockchain_support",
  },
  crypto_trading: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  crypto_investing: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "investing",
  },
  crypto_altcoins: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  crypto_blockchain: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "blockchain_support",
  },
  crypto_bitcoin: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  crypto_defi: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  crypto_ethereum: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  crypto_memecoins: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "trading",
  },
  crypto_nfts: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "investing",
  },
  crypto_research: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "research",
  },
  crypto_rust: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  crypto_solidity: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  life_support: {
    route: "chat",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "life_support",
  },
  smart_contract_development: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  market_analysis: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "analyst",
  },
  market_research: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "market_research",
  },
  evm_chain_trader: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  evm_chain_investor: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "investing",
  },
  evm_chain_developer: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  evm_chain_researcher: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "research",
  },
  evm_chain_analyst: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "analyst",
  },
  evm_chain_strategist: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "strategist",
  },
  solana_chain_trader: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  solana_chain_investor: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "investing",
  },
  solana_chain_developer: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  solana_chain_researcher: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "research",
  },
  solana_chain_analyst: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "analyst",
  },
  solana_chain_strategist: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "strategist",
  },
  bitcoin_investor: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "investing",
  },
  bitcoin_developer: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "developer",
  },
  bitcoin_researcher: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "research",
  },
  bitcoin_analyst: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "analyst",
  },
  bitcoin_strategist: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "strategist",
  },
  bitcoin_trader: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "trading",
  },
  defi_support: {
    route: "orchestrator",
    defaultTier: "gpt-5.4",
    complexTier: "gpt-5.4",
    baselineComplexity: "complex",
    superGroup: "blockchain_support",
  },
  other: {
    route: "chat",
    defaultTier: "balanced",
    complexTier: "gpt-5.4",
    baselineComplexity: "simple",
    superGroup: "other",
  },
};

export function getCategoryPolicy(category: ClassificationCategory) {
  return CATEGORY_POLICIES[category] ?? CATEGORY_POLICIES.other;
}
