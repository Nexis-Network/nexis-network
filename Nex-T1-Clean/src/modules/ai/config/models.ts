/**
 * GPT-5.x Model Configuration for Vercel AI Gateway
 * 
 * Domain: AI Configuration
 * Responsibility: Maps model aliases to Vercel AI Gateway model identifiers
 * Depends on: Vercel AI Gateway (ai package)
 * Notes: All models use the openai/ prefix for Vercel AI Gateway routing
 *        Reference: https://vercel.com/docs/ai-gateway/provider-options
 */

export const preferGpt5 = process.env.NEX_PREFER_GPT5 !== "false";

// DEPRECATED: Gateway bypass removed; pipeline now always uses AI Gateway via Vercel model IDs
export const bypassAiGateway = false;

/**
 * Primary model for general chat - GPT-5.4
 */
export const LEGACY_DEFAULT_MODEL = 
    process.env.NEX_LEGACY_MODEL ??
    process.env.NEX_BASE_CHAT_MODEL ??
    process.env.NEX_BALANCED_MODEL ??
    "openai/gpt-5.4";

/**
 * Model for reasoning/thinking tasks - GPT-5.4
 */
export const REASONING_DEFAULT_MODEL = process.env.NEX_REASONING_MODEL ?? "openai/gpt-5.4";

/**
 * Model for code generation - GPT-4o (great for code)
 */
export const CODEX_DEFAULT_MODEL = process.env.NEX_CODEX_MODEL ?? "openai/gpt-5.4";

/**
 * Embedding models for RAG and semantic search
 */
export const EMBEDDING_SMALL_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_LARGE_MODEL = "openai/text-embedding-3-large";

/**
 * Model map - all models use Vercel AI Gateway format (provider/model)
 * 
 * Documented GPT-5.x Models on Vercel AI Gateway:
 * - openai/gpt-5.4: Unified product default for Nex personas and active subsystems
 * - openai/gpt-5: Standard GPT-5 model (documented)
 * 
 * Fallback to GPT-4 if GPT-5 unavailable:
 * - openai/gpt-4o: Latest flagship model (128k context)
 * - openai/gpt-4o-mini: Smaller, faster version
 * - openai/gpt-4.1-mini: Mini model variant
 * 
 * IMPORTANT: For GPT-5 family models, you must set both
 * reasoningEffort and reasoningSummary in providerOptions to receive reasoning output.
 * Reference: https://vercel.com/docs/ai-gateway/provider-options#reasoning
 */
export const MODEL_MAP: Record<string, string> = {
    // Nex product tiers (current UI keys)
    "nex-t1-free": "openai/gpt-5.4",
    "nex-t1-pro": "openai/gpt-5.4",
    "nex-t1-ultra": "openai/gpt-5.4",
    "nex-build": "openai/gpt-5.4",
    "nex-code": "openai/gpt-5.4",
    "nex-degen": "openai/gpt-5.4",

    // Legacy aliases kept for backwards compatibility
    "nex-t0": "openai/gpt-5.4",
    "nex-t1": "openai/gpt-5.4",
    "nex-coder": "openai/gpt-5.4",
    "degen": "openai/gpt-5.4",
    
    // Direct references
    "gpt-5.3-chat": "openai/gpt-5.4",
    "openai/gpt-5.3-chat": "openai/gpt-5.4",
    "gpt-5.4": "openai/gpt-5.4",
    "openai/gpt-5.4": "openai/gpt-5.4",

    // xAI Grok
    "grok-4.1-fast-non-reasoning": "xai/grok-4.1-fast-non-reasoning",
    "grok-4.1-fast-reasoning": "xai/grok-4.1-fast-reasoning",

    // Legacy/Fallback models
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    
    // Embedding models
    "text-embedding-3-small": EMBEDDING_SMALL_MODEL,
    "text-embedding-3-large": EMBEDDING_LARGE_MODEL,
};

/**
 * Models that require reasoningEffort and reasoningSummary in providerOptions
 * Per Vercel docs: https://vercel.com/docs/ai-gateway/provider-options#reasoning
 * 
 * IMPORTANT: For GPT-5 family models, you MUST set both
 * reasoningEffort and reasoningSummary to receive reasoning output.
 */
export const REASONING_REQUIRED_MODELS = new Set([
    "gpt-5",        // GPT-5 also supports reasoning
    "gpt-5.3-chat", // legacy alias routed to GPT-5.4
    "gpt-5.4",
]);

/**
 * Check if a model requires reasoning providerOptions
 */
export const requiresReasoningOptions = (modelId: string): boolean => {
    const normalizedId = modelId.includes("/") 
        ? modelId.split("/").pop() ?? modelId 
        : modelId;
    return REASONING_REQUIRED_MODELS.has(normalizedId);
};

/**
 * Default model selection based on preferences
 * Uses GPT-5.1 thinking for complex tasks, instant for general chat
 */
export const DEFAULT_MODEL = preferGpt5 ? REASONING_DEFAULT_MODEL : LEGACY_DEFAULT_MODEL;

// Expose the unified set of supported models for UI selection
export const SUPPORTED_MODELS = [
  "openai/gpt-5.4",
];

/**
 * Resolves a model alias to its full Vercel AI Gateway path
 * @param alias - Model alias or full path
 * @returns Full model path with provider prefix (e.g., "openai/gpt-5.4")
 */
export const resolveModelPath = (alias: string): string => {
    const mapped = MODEL_MAP[alias];
    if (mapped) {
        return mapped;
    }
    // Already has provider prefix - return as-is
    if (alias.includes("/")) {
        return alias;
    }
    // Look up in model map, fallback to default
    return MODEL_MAP[alias] ?? DEFAULT_MODEL;
};

/**
 * Extracts the model ID without provider prefix
 * @param fullPath - Full model path (e.g., "openai/gpt-5.4")
 * @returns Model ID without prefix (e.g., "gpt-5.4")
 */
export const extractModelId = (fullPath: string): string => {
    const slashIndex = fullPath.indexOf("/");
    return slashIndex === -1 ? fullPath : fullPath.slice(slashIndex + 1);
};

/**
 * Model context windows (in tokens)
 * Used for message truncation and context management
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    // GPT-5 models
    "gpt-5-nano": 32000,
    "gpt-5": 200000,
    "gpt-5.3-chat": 1_050_000,
    "gpt-5.4": 1_050_000,
    
    // GPT-4 models (well documented)
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4.1-mini": 128000,
    "gpt-4-turbo": 128000,
    
    // Google Gemini models
    "gemini-2.0-flash": 1000000,
    
    // Xai Grok models
    "grok-4": 256000,
    "grok-3": 131072,
    
    // Anthropic models
    "claude-sonnet-4": 200000,
    
    // Embedding models
    "text-embedding-3-small": 8191,
    "text-embedding-3-large": 8191,
};

/**
 * NOTE: OpenAI Prompt Templates have been deprecated in favor of LangFuse prompt management.
 * All prompts are now managed via:
 * - src/modules/chat/pipeline/prompt-factory.ts
 * 
 * See docs/chatbot/technical-framework.md for implementation details.
 */
