/**
 * Superagent Guardrails - Configuration
 * Domain: security
 * Responsibility: Feature flags, thresholds, and runtime configuration
 * Depends on: types
 */

import type { SuperagentConfig, SuperagentMode, SeverityLevel } from "./types";
import { SEVERITY_LEVELS } from "./types";

// ============================================================================
// Environment Configuration
// ============================================================================

const parseMode = (value: string | undefined): SuperagentMode => {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "enforce" || normalized === "monitor") {
    return normalized;
  }
  // Default to monitor mode for safety during rollout
  return "monitor";
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const parseSeverity = (value: string | undefined): SeverityLevel => {
  const normalized = value?.toLowerCase().trim();
  if (
    normalized === SEVERITY_LEVELS.CRITICAL ||
    normalized === SEVERITY_LEVELS.HIGH ||
    normalized === SEVERITY_LEVELS.MEDIUM ||
    normalized === SEVERITY_LEVELS.LOW ||
    normalized === SEVERITY_LEVELS.INFO
  ) {
    return normalized;
  }
  // Default to high - blocks critical and high severity violations
  return SEVERITY_LEVELS.HIGH;
};

const parseStringList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
};

// ============================================================================
// Configuration Loader
// ============================================================================

let cachedConfig: SuperagentConfig | null = null;

export const loadSuperagentConfig = (): SuperagentConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.SUPERAGENT_API_KEY?.trim() ?? "";

  cachedConfig = {
    apiKey,
    mode: parseMode(process.env.SUPERAGENT_MODE),
    toolGuardEnabled: parseBoolean(process.env.SUPERAGENT_TOOL_GUARD_ENABLED, true),
    fileScanEnabled: parseBoolean(process.env.SUPERAGENT_FILE_SCAN_ENABLED, true),
    outputVerifyEnabled: parseBoolean(process.env.SUPERAGENT_OUTPUT_VERIFY_ENABLED, true),
    redactEnabled: parseBoolean(process.env.SUPERAGENT_REDACT_ENABLED, true),
    blockingThreshold: parseSeverity(process.env.SUPERAGENT_BLOCKING_THRESHOLD),
    allowedTools: parseStringList(process.env.SUPERAGENT_ALLOWED_TOOLS),
    trustedDomains: parseStringList(process.env.SUPERAGENT_TRUSTED_DOMAINS),
  };

  return cachedConfig;
};

export const clearConfigCache = (): void => {
  cachedConfig = null;
};

// ============================================================================
// Feature Flag Helpers
// ============================================================================

/**
 * Checks if the remote Superagent API is available (requires API key).
 * When false, falls back to local detection.
 */
export const isSuperagentApiEnabled = (): boolean => {
  const config = loadSuperagentConfig();
  if (!config.apiKey) return false;

  if (process.env.NODE_ENV === "test") {
    return true;
  }

  // The default API URL (api.superagent.sh) is currently returning 404s.
  // We disable the API client if no custom URL is provided or if using the default,
  // to force fallback to local detection and prevent error logs.
  const baseUrl = process.env.SUPERAGENT_BASE_URL;
  const defaultUrl = "https://api.superagent.sh";
  
  if (!baseUrl || baseUrl === defaultUrl) {
    return false;
  }

  return true;
};

/**
 * Checks if guardrails are enabled (local detection OR remote API).
 * Local detection is always available unless explicitly disabled.
 * 
 * Use `SUPERAGENT_GUARDRAILS_DISABLED=true` to completely disable all guardrails.
 */
export const isSuperagentEnabled = (): boolean => {
  // Allow explicit disable via environment variable
  if (process.env.SUPERAGENT_GUARDRAILS_DISABLED === "true") {
    return false;
  }
  // Guardrails are enabled by default (local fallback works without API key)
  return true;
};

export const isEnforceMode = (): boolean => {
  const config = loadSuperagentConfig();
  return config.mode === "enforce";
};

export const isMonitorMode = (): boolean => {
  const config = loadSuperagentConfig();
  return config.mode === "monitor";
};

export const isToolGuardEnabled = (): boolean => {
  const config = loadSuperagentConfig();
  // Tool guard enabled by default, uses local detection when API key unavailable
  return config.toolGuardEnabled && isSuperagentEnabled();
};

export const isFileScanEnabled = (): boolean => {
  const config = loadSuperagentConfig();
  // File scan enabled by default, uses local detection when API key unavailable
  return config.fileScanEnabled && isSuperagentEnabled();
};

export const isOutputVerifyEnabled = (): boolean => {
  const config = loadSuperagentConfig();
  // Output verify enabled by default, uses local detection when API key unavailable
  return config.outputVerifyEnabled && isSuperagentEnabled();
};

export const isRedactEnabled = (): boolean => {
  const config = loadSuperagentConfig();
  // Redaction enabled by default, uses local detection when API key unavailable
  return config.redactEnabled && isSuperagentEnabled();
};

// ============================================================================
// Severity Helpers
// ============================================================================

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  [SEVERITY_LEVELS.CRITICAL]: 5,
  [SEVERITY_LEVELS.HIGH]: 4,
  [SEVERITY_LEVELS.MEDIUM]: 3,
  [SEVERITY_LEVELS.LOW]: 2,
  [SEVERITY_LEVELS.INFO]: 1,
};

export const shouldBlock = (severity: SeverityLevel): boolean => {
  const config = loadSuperagentConfig();
  
  // In monitor mode, never block
  if (config.mode === "monitor") {
    return false;
  }
  
  const thresholdRank = SEVERITY_RANK[config.blockingThreshold];
  const severityRank = SEVERITY_RANK[severity];
  
  return severityRank >= thresholdRank;
};

export const isToolAllowed = (toolName: string): boolean => {
  const config = loadSuperagentConfig();
  
  // If no allowlist configured, allow all tools
  if (!config.allowedTools || config.allowedTools.length === 0) {
    return true;
  }
  
  return config.allowedTools.includes(toolName);
};

export const isDomainTrusted = (domain: string): boolean => {
  const config = loadSuperagentConfig();
  
  // If no trusted domains configured, trust none by default
  if (!config.trustedDomains || config.trustedDomains.length === 0) {
    return false;
  }
  
  return config.trustedDomains.some((trusted) => 
    domain === trusted || domain.endsWith(`.${trusted}`)
  );
};

// ============================================================================
// Default Policies
// ============================================================================

export const DEFAULT_REDACT_TYPES = ["PII", "PHI", "API_KEYS", "CREDENTIALS"] as const;

export const HIGH_RISK_TOOLS = new Set([
  // EVM value-moving
  "wallet_send_transaction",
  "wallet_sign_transaction",
  "wallet_sign_message",
  "wallet_sign_typed_data",
  // Token operations
  "token_minter",
  // Solana value-moving
  "pumpfun_trader",
  "helius_execute_jupiter_swap",
  // Bitcoin value-moving
  "send_bitcoin",
  "create_invoice",
  // DEX execution
  "cow_swap_execute",
  // BSC value-moving
  "bsc_chain",
  // MCP value-moving (when enabled)
  "mcp_uniswap__executeSwap",
  "mcp_hyperliquid__hyperliquid_place_order",
  "mcp_hyperliquid__hyperliquid_place_bracket_order",
  "mcp_cow__executeSwap",
  // Polymarket trading
  "polymarket_trade",
]);

export const isHighRiskTool = (toolName: string): boolean => {
  // Exact match
  if (HIGH_RISK_TOOLS.has(toolName)) return true;
  // Pattern match for MCP value-moving tools (prefix-based)
  if (toolName.startsWith("mcp_") && toolName.includes("execute")) return true;
  if (toolName.startsWith("mcp_") && toolName.includes("place_order")) return true;
  return false;
};

// ============================================================================
// Prompt Leak Detection Patterns
// ============================================================================

/**
 * Patterns that indicate a user is attempting to extract the system prompt.
 * Used by guardPrompt for additional local detection.
 */
export const PROMPT_LEAK_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?instructions/i,
  /what\s+are\s+your\s+(system\s+)?instructions/i,
  /repeat\s+(the\s+)?(text|words)\s+above/i,
  /print\s+(your\s+)?(system|initial)\s+(prompt|message)/i,
  /output\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
  /you\s+are\s+now\s+(in\s+)?(\w+\s+)?mode/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /act\s+as\s+(a\s+)?(?:DAN|unrestricted|unfiltered)/i,
  /pretend\s+(you\s+)?(are|have)\s+no\s+(rules|restrictions|limits)/i,
] as const;

/**
 * Check if a user message contains prompt leak/jailbreak patterns.
 * Returns the matched pattern description if found, null otherwise.
 */
export const detectPromptLeakAttempt = (message: string): string | null => {
  for (const pattern of PROMPT_LEAK_PATTERNS) {
    if (pattern.test(message)) {
      return `Matched pattern: ${pattern.source}`;
    }
  }
  return null;
};

// ============================================================================
// Tool Output Injection Patterns
// ============================================================================

/**
 * Patterns in tool outputs that suggest prompt injection attempts.
 * Tool outputs containing these should have the instruction text stripped.
 */
export const TOOL_OUTPUT_INJECTION_PATTERNS = [
  /(?:system|assistant|human):\s/i,
  /ignore\s+(?:all\s+)?previous/i,
  /you\s+(?:are|must)\s+now/i,
  /new\s+instructions?:/i,
  /override\s+(?:your\s+)?(?:instructions|rules)/i,
  /<\/?(?:system|prompt|instruction)>/i,
] as const;

/**
 * Check if a tool output contains suspicious injection patterns.
 */
export const detectToolOutputInjection = (output: string): boolean => {
  return TOOL_OUTPUT_INJECTION_PATTERNS.some((pattern) => pattern.test(output));
};
