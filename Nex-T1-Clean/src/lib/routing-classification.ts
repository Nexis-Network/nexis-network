export const CLASSIFICATION_MODES = ["auto", "chat", "orchestrator", "evaluator_optimizer"] as const;
export type ClassificationMode = (typeof CLASSIFICATION_MODES)[number];
export type ClassificationRoute = Exclude<ClassificationMode, "auto">;
export const CLASSIFICATION_ROUTES = ["chat", "orchestrator", "evaluator_optimizer"] as const satisfies readonly ClassificationRoute[];

export const CLASSIFICATION_COMPLEXITIES = ["simple", "complex"] as const;
export type ClassificationComplexity = (typeof CLASSIFICATION_COMPLEXITIES)[number];

export const CLASSIFICATION_MODEL_TIERS = [
  "gpt-5.4",
  "gpt-5",
  "gpt-5-mini",
  "codex-mini-latest",
  "gpt-5-nano",
  "sora-2",
  "balanced",
] as const;
export type ClassificationModelTier = (typeof CLASSIFICATION_MODEL_TIERS)[number];

export const CLASSIFICATION_CATEGORIES = [
  "general_chat",
  "general_support",
  "product_support",
  "technical_support",
  "blockchain_support",
  "web3_transactions",
  "crypto_trading",
  "crypto_investing",
  "crypto_altcoins",
  "crypto_blockchain",
  "crypto_bitcoin",
  "crypto_defi",
  "crypto_ethereum",
  "crypto_memecoins",
  "crypto_nfts",
  "crypto_research",
  "crypto_rust",
  "crypto_solidity",
  "life_support",
  "smart_contract_development",
  "market_analysis",
  "market_research",
  "evm_chain_trader",
  "evm_chain_investor",
  "evm_chain_developer",
  "evm_chain_researcher",
  "evm_chain_analyst",
  "evm_chain_strategist",
  "solana_chain_trader",
  "solana_chain_investor",
  "solana_chain_developer",
  "solana_chain_researcher",
  "solana_chain_analyst",
  "solana_chain_strategist",
  "bitcoin_investor",
  "bitcoin_developer",
  "bitcoin_researcher",
  "bitcoin_analyst",
  "bitcoin_strategist",
  "bitcoin_trader",
  "defi_support",
  "other",
] as const;
export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

export type ClassificationResult = {
  type: ClassificationCategory;
  complexity: ClassificationComplexity;
  confidence: number;
  route: ClassificationRoute;
  modelTier: ClassificationModelTier;
};

export type ClassifyRequestResult =
  | { success: true; data: ClassificationResult; heuristicsConfidence?: number }
  | { success: false; error: string };
