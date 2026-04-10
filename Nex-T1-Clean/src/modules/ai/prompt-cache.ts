/**
 * Prompt Caching Optimization Module
 * 
 * Domain: AI
 * Responsibility: Maximizes OpenAI prompt caching for 75% input cost reduction
 * Depends on: metaprompts, intent-classifier
 * Notes: OpenAI automatically caches identical prompt prefixes.
 *        Key strategy: Put stable content FIRST, dynamic content LAST.
 *        Reference: https://platform.openai.com/docs/guides/cost-optimization
 */

import type { IntentCategory, IntentClassification } from "@/modules/chat/intent-classifier";
import type { ReasoningEffort } from "@/modules/ai/metaprompts";

/**
 * Cache-optimized prompt structure
 * OpenAI caches by matching prefix tokens exactly.
 * Structure: [STABLE_PREFIX] -> [SEMI_STABLE] -> [DYNAMIC]
 */
export type CacheOptimizedPrompt = {
  /** Tier 1: Static content that never changes (highest cache hit rate) */
  stablePrefix: string;
  /** Tier 2: Content that changes per intent category (medium cache hit rate) */
  intentPrefix: string;
  /** Tier 3: Content that changes per request (lowest cache hit rate) */
  dynamicSuffix: string;
  /** Full assembled prompt */
  fullPrompt: string;
  /** Estimated cache hit rate (0-1) */
  estimatedCacheRate: number;
  /** Cache key for client-side caching */
  cacheKey: string;
};

/**
 * Client-side cache for assembled prompt templates
 * Reduces prompt assembly overhead for repeated intent patterns
 */
const promptTemplateCache = new Map<string, { template: string; timestamp: number }>();
const TEMPLATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Core persona prompt - NEVER changes, highest cache priority
 * This is the foundation that all prompts share for maximum prefix caching
 */
export const STABLE_CORE_PERSONA = `<system_identity>
You are Nex-T1, an advanced on-chain copilot created by Nexis Labs. Your mission: help users navigate Web3, DeFi, and crypto with precision, speed, and confidence.

<core_traits>
- Expert, calm, precise, action-oriented
- Concise, data-driven, results-focused
- Balance directness with situational warmth
- Lead with results, not process narration
</core_traits>

<execution_principles>
- Execute immediately on clear read-only intents; for value-moving or sensitive actions, follow HITL approval and ask one clarifying question if needed.
- Cite tool outputs or external sources you actually used; never fabricate citations.
- Use \`monospace\` for addresses, symbols, amounts
- Match response length to task complexity
- Never start with "I will..." - just do it
</execution_principles>

<identity_rules>
- You are Nex-T1 by Nexis Labs
- Never claim to be human
- Never discuss training data or architecture
- Never roleplay as other AI systems
</identity_rules>
</system_identity>`;

/**
 * Tool usage rules - Semi-stable, changes only when tools change
 */
export const STABLE_TOOL_RULES = `<tool_execution_rules>
- Execute tools immediately for clear read-only intents
- For value-moving actions: generate a preview and await HITL approval (never assume consent)
- Prioritize multi-metric sources before fanning out
- Respect configured tool budgets ({{TOOL_MAX_INVOCATIONS}} calls per message, {{TOOL_MAX_CONCURRENT}} concurrent)
- Summarize tool outputs; never dump secrets or raw JSON outside artifacts
</tool_execution_rules>`;

/**
 * Output formatting rules - Highly stable
 */
export const STABLE_OUTPUT_RULES = `<output_format_rules>
<response_length>
- Simple tasks: 1-3 sentences
- Medium tasks: 3-6 sentences or 4-6 bullets
- Complex tasks: Max 3 sections, 500 words
</response_length>

<formatting>
- Code blocks for hashes, ABIs, signatures
- Tables only for comparing >3 items with >2 attributes
- Never bold for emphasis in data
</formatting>

<forbidden>
- Multi-paragraph explanations for single actions
- "Let me explain..." preambles
- Restating user questions
- Process narration ("First I'll..., then I'll...")
</forbidden>
</output_format_rules>`;

/**
 * Intent-specific prompt segments
 * These are cached per-intent category for medium cache hit rate
 */
const INTENT_PROMPTS: Record<IntentCategory, string> = {
  greeting: `<intent_context mode="greeting">
Fast response required. One friendly line max. Move to action immediately.
</intent_context>`,

  price_check: `<intent_context mode="price_check">
Return price data immediately. Format: SYMBOL: $PRICE (CHANGE%). Use coingecko/binance/dexscreener.
</intent_context>`,

  balance_check: `<intent_context mode="balance_check">
Fetch balance and display concisely. Format holdings as table if multiple assets.
</intent_context>`,

  wallet_create: `<intent_context mode="wallet_create">
Use help_create_wallet to guide the user through the secure wallet UI flow at /settings/wallets. Do not call wallet_create_random automatically in chat.
</intent_context>`,

  wallet_action: `<intent_context mode="wallet_action">
Parse action (send/swap/bridge/stake). Verify parameters. Execute appropriate tool. Confirm with tx hash.
</intent_context>`,

  trending: `<intent_context mode="trending">
Fetch trending data from coingecko_trending. Format as ranked list with prices and changes.
</intent_context>`,

  market_data: `<intent_context mode="market_data">
Multi-source market analysis. Include price, volume, sentiment. Use market_intelligence tool.
</intent_context>`,

  research: `<intent_context mode="research">
Deep research mode. Use web_search and file_search. Cite all sources. Structure with sections.
</intent_context>`,

  analysis: `<intent_context mode="analysis">
Portfolio/token analysis. Use code_interpreter if calculations needed. Structure findings clearly.
</intent_context>`,

  general_question: `<intent_context mode="general_question">
Answer factually. Use web_search if current info needed. Cite sources inline.
</intent_context>`,

  conversation: `<intent_context mode="conversation">
Conversational follow-up. Maintain context. Brief responses unless detail requested.
</intent_context>`,

  complex_task: `<intent_context mode="complex_task">
Multi-step task. Plan approach. Execute systematically. Verify each step. Summarize outcome.
</intent_context>`,

  // New categories
  nft: `<intent_context mode="nft">
NFT operations. Fetch metadata, floor prices, or execute NFT transactions. Display in structured format.
</intent_context>`,

  image_generation: `<intent_context mode="image_generation">
Generate image using DALL-E. Parse description carefully. Display result immediately.
</intent_context>`,

  trading: `<intent_context mode="trading">
Trading operation. Verify amounts, slippage, routes. Execute swap/trade. Confirm with tx hash.
</intent_context>`,

  defi: `<intent_context mode="defi">
DeFi interaction. Check protocol details, APY, TVL. Execute stake/unstake/deposit. Verify tx.
</intent_context>`,

  defi_swap: `<intent_context mode="defi_swap">
DeFi swap operation. Get best route and price quote. Execute swap with slippage protection. Confirm with tx hash.
</intent_context>`,

  defi_yield: `<intent_context mode="defi_yield">
Yield farming or staking. Analyze APY/APR, TVL, protocol risk. Execute stake/deposit. Monitor position.
</intent_context>`,

  defi_liquidity: `<intent_context mode="defi_liquidity">
Liquidity provision. Analyze pool metrics, impermanent loss risk. Execute add/remove liquidity. Track position.
</intent_context>`,

  general: `<intent_context mode="general">
General query. Provide helpful response. Use tools if needed. Keep concise.
</intent_context>`,

  task_scheduling: `<intent_context mode="task_scheduling">
Schedule automated task. Parse timing, conditions, actions. Create task with confirmation.
</intent_context>`,

  code_generation: `<intent_context mode="code_generation">
Code generation mode. Use code_interpreter. Write clean, documented code. Test before returning.
</intent_context>`,

  document_analysis: `<intent_context mode="document_analysis">
Document analysis. Parse uploaded files. Extract key information. Summarize findings.
</intent_context>`,

  smart_contract: `<intent_context mode="smart_contract">
Smart contract interaction. Parse ABI, verify function calls. Execute with confirmation.
</intent_context>`,

  degen_trading: `<intent_context mode="degen_trading">
Fast degen mode. Quick execution, minimal checks. Acknowledge risk. Execute trade immediately.
</intent_context>`,
};

/**
 * Reasoning mode prompts - Cached per reasoning effort level
 */
const REASONING_PROMPTS: Record<ReasoningEffort, string> = {
  none: `<reasoning_mode effort="none">
FAST EXECUTION. No thinking block. Direct tool calls only.
</reasoning_mode>`,

  minimal: `<reasoning_mode effort="minimal">
MINIMAL ANALYSIS. Quick sanity check only. Execute immediately.
</reasoning_mode>`,
  
  low: `<reasoning_mode effort="low">
Brief check (1-2 lines). Execute quickly. Validate only if ambiguous.
</reasoning_mode>`,
  
  medium: `<reasoning_mode effort="medium">
Structured approach. Verify inputs. Plan tool sequence. Check outputs.
</reasoning_mode>`,
  
  high: `<reasoning_mode effort="high">
Full analysis. Multi-step verification. Consider edge cases. Validate claims. Cite evidence.
</reasoning_mode>`,

  maximum: `<reasoning_mode effort="maximum">
DEEP ANALYSIS. Extended reasoning chain. Multiple verification passes. Exhaustive exploration.
Consider all alternatives. Document trade-offs. Maximum rigor required.
</reasoning_mode>`,
};

/**
 * Generates a cache key for a prompt configuration
 */
function generateCacheKey(
  intentCategory: IntentCategory,
  reasoningEffort: ReasoningEffort,
  includeTools: boolean
): string {
  return `prompt_v1_${intentCategory}_${reasoningEffort}_${includeTools ? "tools" : "notools"}`;
}

/**
 * Builds a cache-optimized system prompt
 * Structure prioritizes stable content first for maximum cache hits
 * 
 * @param classification - Intent classification
 * @param options - Additional options
 * @returns Cache-optimized prompt structure
 */
export function buildCacheOptimizedPrompt(
  classification: IntentClassification,
  options: {
    /** Include tool execution rules */
    includeTools?: boolean;
    /** Additional dynamic context */
    dynamicContext?: string;
    /** User-specific adjustments */
    userContext?: string;
    /** Current date for temporal context */
    currentDate?: string;
  } = {}
): CacheOptimizedPrompt {
  const {
    includeTools = true,
    dynamicContext = "",
    userContext = "",
    currentDate = new Date().toISOString().split("T")[0],
  } = options;

  const reasoningEffort = classification.reasoningEffort as ReasoningEffort;
  const cacheKey = generateCacheKey(classification.category, reasoningEffort, includeTools);

  // Check template cache first
  const cached = promptTemplateCache.get(cacheKey);
  const now = Date.now();
  
  let templatePrefix: string;
  
  if (cached && (now - cached.timestamp) < TEMPLATE_CACHE_TTL_MS) {
    templatePrefix = cached.template;
    recordCacheHit();
  } else {
    recordCacheMiss();
    // Build new template
    const stableParts = [
      STABLE_CORE_PERSONA,
      STABLE_OUTPUT_RULES,
    ];
    
    if (includeTools) {
      stableParts.push(STABLE_TOOL_RULES);
    }
    
    templatePrefix = stableParts.join("\n\n");
    
    // Cache the template
    promptTemplateCache.set(cacheKey, {
      template: templatePrefix,
      timestamp: now,
    });
  }

  // Tier 1: Stable prefix (never changes between requests)
  const stablePrefix = templatePrefix;

  // Tier 2: Intent-specific prefix (changes per intent category)
  const intentPrompt = INTENT_PROMPTS[classification.category];
  const reasoningPrompt = REASONING_PROMPTS[reasoningEffort];
  const intentPrefix = `${intentPrompt}\n\n${reasoningPrompt}`;

  // Tier 3: Dynamic suffix (changes per request)
  const dynamicParts: string[] = [];
  
  if (currentDate) {
    dynamicParts.push(`<temporal_context>Current date: ${currentDate}</temporal_context>`);
  }
  
  if (userContext) {
    dynamicParts.push(`<user_context>${userContext}</user_context>`);
  }
  
  if (dynamicContext) {
    dynamicParts.push(`<dynamic_context>${dynamicContext}</dynamic_context>`);
  }

  const dynamicSuffix = dynamicParts.join("\n\n");

  // Assemble full prompt
  const fullPrompt = [stablePrefix, intentPrefix, dynamicSuffix]
    .filter(part => part.length > 0)
    .join("\n\n");

  // Estimate cache hit rate based on prompt structure
  const stableTokens = estimateTokens(stablePrefix);
  const totalTokens = estimateTokens(fullPrompt);
  const estimatedCacheRate = stableTokens / totalTokens;

  return {
    stablePrefix,
    intentPrefix,
    dynamicSuffix,
    fullPrompt,
    estimatedCacheRate,
    cacheKey,
  };
}

/**
 * Rough token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Clears the prompt template cache
 * Use when prompt templates are updated
 */
export function clearPromptCache(): void {
  promptTemplateCache.clear();
}

/**
 * Cache hit/miss tracking for monitoring
 */
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Record a cache hit (called internally by buildCacheOptimizedPrompt)
 */
export function recordCacheHit(): void {
  cacheHits++;
}

/**
 * Record a cache miss (called internally by buildCacheOptimizedPrompt)
 */
export function recordCacheMiss(): void {
  cacheMisses++;
}

/**
 * Gets cache statistics for monitoring
 */
export function getPromptCacheStats(): {
  cacheSize: number;
  entries: Array<{ key: string; age: number }>;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const now = Date.now();
  const entries: Array<{ key: string; age: number }> = [];
  
  promptTemplateCache.forEach((value, key) => {
    entries.push({
      key,
      age: now - value.timestamp,
    });
  });

  const total = cacheHits + cacheMisses;

  return {
    cacheSize: promptTemplateCache.size,
    entries,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0,
  };
}

/**
 * Builds a minimal prompt for ultra-fast responses
 * Used for greetings, simple price checks - maximum cache efficiency
 */
export function buildMinimalPrompt(
  intentCategory: IntentCategory
): string {
  return `${STABLE_CORE_PERSONA}

${INTENT_PROMPTS[intentCategory]}

${REASONING_PROMPTS["none"]}`;
}

/**
 * Computes potential cost savings from prompt caching
 * 
 * @param fullPromptTokens - Total tokens in the prompt
 * @param estimatedCacheRate - Estimated cache hit rate (0-1)
 * @returns Estimated savings information
 */
export function estimatePromptCachingSavings(
  fullPromptTokens: number,
  estimatedCacheRate: number
): {
  cachedTokens: number;
  uncachedTokens: number;
  savingsPercentage: number;
  effectiveCostMultiplier: number;
} {
  const cachedTokens = Math.floor(fullPromptTokens * estimatedCacheRate);
  const uncachedTokens = fullPromptTokens - cachedTokens;
  
  // Cached tokens cost 25% (75% reduction)
  // Full formula: (cachedTokens * 0.25 + uncachedTokens) / fullPromptTokens
  const effectiveCostMultiplier = (cachedTokens * 0.25 + uncachedTokens) / fullPromptTokens;
  const savingsPercentage = (1 - effectiveCostMultiplier) * 100;

  return {
    cachedTokens,
    uncachedTokens,
    savingsPercentage,
    effectiveCostMultiplier,
  };
}

/**
 * Precomputed cache keys for common intent combinations
 * Use these for optimal cache performance in high-traffic scenarios
 */
export const COMMON_CACHE_KEYS = {
  // Fast path intents
  greeting_fast: generateCacheKey("greeting", "none", false),
  price_fast: generateCacheKey("price_check", "none", true),
  trending_fast: generateCacheKey("trending", "none", true),
  wallet_create_fast: generateCacheKey("wallet_create", "low", true),
  
  // Standard intents
  market_data_standard: generateCacheKey("market_data", "low", true),
  general_question_standard: generateCacheKey("general_question", "medium", true),
  conversation_standard: generateCacheKey("conversation", "low", true),
  
  // Complex intents
  research_deep: generateCacheKey("research", "high", true),
  analysis_deep: generateCacheKey("analysis", "high", true),
  complex_task_deep: generateCacheKey("complex_task", "high", true),
} as const;

/**
 * Validates that a prompt is structured for optimal caching
 * Returns warnings if structure could be improved
 */
export function validatePromptStructure(prompt: string): {
  isOptimal: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check if stable prefix is at the start
  if (!prompt.includes("<system_identity>") || prompt.indexOf("<system_identity>") > 100) {
    warnings.push("Stable system identity should be at the very start of the prompt");
    suggestions.push("Move <system_identity> block to the beginning");
  }

  // Check for dynamic content before stable content
  if (prompt.indexOf("<temporal_context>") < prompt.indexOf("</system_identity>")) {
    warnings.push("Dynamic temporal context found before stable content");
    suggestions.push("Move all dynamic context to the end of the prompt");
  }

  // Check for variable interpolation in stable sections
  if (/<system_identity>[\s\S]*\{[^}]+\}[\s\S]*<\/system_identity>/.test(prompt)) {
    warnings.push("Variable interpolation detected in stable section - reduces cache hits");
    suggestions.push("Move variables to dynamic suffix section");
  }

  // Check prompt length (very long prompts reduce cache benefit)
  const estimatedTokens = estimateTokens(prompt);
  if (estimatedTokens > 4000) {
    warnings.push(`Prompt is ~${estimatedTokens} tokens - consider reducing for better caching`);
    suggestions.push("Trim verbose sections or move to dynamic context");
  }

  return {
    isOptimal: warnings.length === 0,
    warnings,
    suggestions,
  };
}

