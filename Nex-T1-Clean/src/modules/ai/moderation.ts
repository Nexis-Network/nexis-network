/**
 * OpenAI Moderation API Integration
 * 
 * Domain: AI
 * Responsibility: Content safety filtering for inputs and outputs
 * Depends on: ai-sdk/openai
 * Notes: Implements pre-request and post-response moderation.
 *        Reference: https://platform.openai.com/docs/guides/safety-best-practices
 */

import { buildOpenAIHeaders, openaiConfig } from "@/server/services/ai-sdk/openai";


import { logger } from '@/lib/logger';
/**
 * Moderation categories from OpenAI API
 */
export type ModerationCategory =
  | "sexual"
  | "sexual/minors"
  | "harassment"
  | "harassment/threatening"
  | "hate"
  | "hate/threatening"
  | "illicit"
  | "illicit/violent"
  | "self-harm"
  | "self-harm/intent"
  | "self-harm/instructions"
  | "violence"
  | "violence/graphic";

/**
 * Full moderation result from API
 */
export type ModerationResult = {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: Record<ModerationCategory, boolean>;
    category_scores: Record<ModerationCategory, number>;
  }>;
};

/**
 * Simplified moderation status
 */
export type ModerationStatus = {
  /** Whether content was flagged */
  flagged: boolean;
  /** Categories that were flagged */
  flaggedCategories: ModerationCategory[];
  /** Highest scoring category */
  topCategory: ModerationCategory | null;
  /** Highest score */
  topScore: number;
  /** All scores for analysis */
  scores: Record<ModerationCategory, number>;
  /** Whether this was a hard block (severe content) */
  hardBlock: boolean;
  /** Suggested action */
  action: "allow" | "warn" | "block";
};

/**
 * Moderation configuration
 */
export type ModerationConfig = {
  /** Categories to hard block on */
  hardBlockCategories: ModerationCategory[];
  /** Categories to warn on (allow but log) */
  warnCategories: ModerationCategory[];
  /** Score threshold for warnings (0-1) */
  warnThreshold: number;
  /** Score threshold for blocking (0-1) */
  blockThreshold: number;
  /** Whether to moderate outputs */
  moderateOutputs: boolean;
  /** Whether to moderate inputs */
  moderateInputs: boolean;
};

/**
 * Default moderation configuration
 */
const DEFAULT_CONFIG: ModerationConfig = {
  hardBlockCategories: [
    "sexual/minors",
    "hate/threatening",
    "illicit/violent",
    "self-harm/instructions",
    "violence/graphic",
  ],
  warnCategories: [
    "harassment",
    "hate",
    "self-harm",
    "violence",
    "illicit",
  ],
  warnThreshold: 0.5,
  blockThreshold: 0.8,
  moderateOutputs: true,
  moderateInputs: true,
};

// Moderation API endpoint
const MODERATION_ENDPOINT = (() => {
  const rawBase = openaiConfig.baseURL?.trim() ?? "https://api.openai.com/v1";
  const withoutTrailingSlash = rawBase.replace(/\/+$/, "");
  return `${withoutTrailingSlash}/moderations`;
})();

// Environment configuration
const MODERATION_ENABLED = (process.env.NEX_MODERATION_ENABLED ?? "true").toLowerCase() === "true";
const MODERATION_MODEL = process.env.NEX_MODERATION_MODEL ?? "omni-moderation-latest";

/**
 * Calls the OpenAI Moderation API
 */
async function callModerationApi(input: string | string[]): Promise<ModerationResult> {
  const response = await fetch(MODERATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenAIHeaders(),
    },
    body: JSON.stringify({
      input,
      model: MODERATION_MODEL,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Moderation API failed: ${response.status} ${text}`);
  }

  return (await response.json()) as ModerationResult;
}

/**
 * Analyzes moderation result into simplified status
 */
function analyzeModerationResult(
  result: ModerationResult,
  config: ModerationConfig
): ModerationStatus {
  if (!result.results || result.results.length === 0) {
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }

  const firstResult = result.results[0];
  const { categories, category_scores } = firstResult;

  // Find flagged categories
  const flaggedCategories = (Object.entries(categories) as Array<[ModerationCategory, boolean]>)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  // Find top scoring category
  let topCategory: ModerationCategory | null = null;
  let topScore = 0;
  
  for (const [category, score] of Object.entries(category_scores) as Array<[ModerationCategory, number]>) {
    if (score > topScore) {
      topScore = score;
      topCategory = category;
    }
  }

  // Check for hard blocks
  const hardBlock = flaggedCategories.some(cat => config.hardBlockCategories.includes(cat));

  // Determine action
  let action: "allow" | "warn" | "block" = "allow";
  
  if (hardBlock || topScore >= config.blockThreshold) {
    action = "block";
  } else if (
    topScore >= config.warnThreshold || 
    flaggedCategories.some(cat => config.warnCategories.includes(cat))
  ) {
    action = "warn";
  }

  return {
    flagged: firstResult.flagged,
    flaggedCategories,
    topCategory,
    topScore,
    scores: category_scores,
    hardBlock,
    action,
  };
}

/**
 * Moderates input text before sending to model
 * 
 * @param input - User input text
 * @param config - Optional custom configuration
 * @returns Moderation status
 */
export async function moderateInput(
  input: string,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<ModerationStatus> {
  if (!MODERATION_ENABLED || !config.moderateInputs) {
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }

  // Skip very short inputs
  if (input.trim().length < 3) {
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }

  try {
    const result = await callModerationApi(input);
    return analyzeModerationResult(result, config);
  } catch (error) {
    logger.error("[moderation] Input moderation failed:", error);
    // Fail open - allow content if moderation fails
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }
}

/**
 * Moderates output text after receiving from model
 * 
 * @param output - Model output text
 * @param config - Optional custom configuration
 * @returns Moderation status
 */
export async function moderateOutput(
  output: string,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<ModerationStatus> {
  if (!MODERATION_ENABLED || !config.moderateOutputs) {
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }

  // Skip very short outputs
  if (output.trim().length < 10) {
    return {
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow",
    };
  }

  try {
    const result = await callModerationApi(output);
    return analyzeModerationResult(result, config);
  } catch (error) {
    logger.error("[moderation] Output moderation failed:", error);
    // For outputs, fail closed - block if moderation fails
    return {
      flagged: true,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "warn", // Warn but don't hard block on moderation failure
    };
  }
}

/**
 * Moderates multiple texts in a batch
 * More efficient than individual calls
 */
export async function moderateBatch(
  texts: string[],
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<ModerationStatus[]> {
  if (!MODERATION_ENABLED || texts.length === 0) {
    return texts.map(() => ({
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow" as const,
    }));
  }

  try {
    const result = await callModerationApi(texts);
    return result.results.map((_, index) => {
      const singleResult: ModerationResult = {
        id: result.id,
        model: result.model,
        results: [result.results[index]],
      };
      return analyzeModerationResult(singleResult, config);
    });
  } catch (error) {
    logger.error("[moderation] Batch moderation failed:", error);
    // Return neutral results on failure
    return texts.map(() => ({
      flagged: false,
      flaggedCategories: [],
      topCategory: null,
      topScore: 0,
      scores: {} as Record<ModerationCategory, number>,
      hardBlock: false,
      action: "allow" as const,
    }));
  }
}

/**
 * Generates a safe response for blocked content
 */
export function generateBlockedResponse(
  status: ModerationStatus,
  options?: {
    includeReason?: boolean;
    alternativeSuggestion?: string;
  }
): string {
  const { includeReason = false, alternativeSuggestion } = options ?? {};

  if (status.hardBlock) {
    return "I can't help with that request. Please try asking something else.";
  }

  let response = "I need to skip that particular request.";
  
  if (includeReason && status.topCategory) {
    const categoryNames: Record<ModerationCategory, string> = {
      "sexual": "adult content",
      "sexual/minors": "inappropriate content",
      "harassment": "harassing content",
      "harassment/threatening": "threatening content",
      "hate": "hateful content",
      "hate/threatening": "threatening content",
      "illicit": "illicit activity",
      "illicit/violent": "violent illegal activity",
      "self-harm": "self-harm content",
      "self-harm/intent": "self-harm content",
      "self-harm/instructions": "harmful instructions",
      "violence": "violent content",
      "violence/graphic": "graphic violence",
    };
    
    const reason = categoryNames[status.topCategory] ?? "inappropriate content";
    response = `I can't help with requests involving ${reason}.`;
  }

  if (alternativeSuggestion) {
    response += ` ${alternativeSuggestion}`;
  } else {
    response += " How else can I help you today?";
  }

  return response;
}

/**
 * Checks if moderation is enabled
 */
export function isModerationEnabled(): boolean {
  return MODERATION_ENABLED;
}

/**
 * Gets the current moderation configuration
 */
export function getModerationConfig(): ModerationConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Creates a custom moderation configuration
 */
export function createModerationConfig(
  overrides: Partial<ModerationConfig>
): ModerationConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

/**
 * Quick check if a moderation status should block the request
 */
export function shouldBlock(status: ModerationStatus): boolean {
  return status.action === "block";
}

/**
 * Quick check if a moderation status warrants a warning
 */
export function shouldWarn(status: ModerationStatus): boolean {
  return status.action === "warn" || status.action === "block";
}

/**
 * Logs moderation event for monitoring
 */
export function logModerationEvent(
  type: "input" | "output",
  status: ModerationStatus,
  context?: {
    userId?: string;
    sessionId?: string;
    messageId?: string;
  }
): void {
  if (!status.flagged && status.action === "allow") {
    return; // Don't log clean content
  }

  logger.warn("[moderation]", {
    type,
    flagged: status.flagged,
    action: status.action,
    topCategory: status.topCategory,
    topScore: status.topScore,
    flaggedCategories: status.flaggedCategories,
    ...context,
  });
}

/**
 * Combined input moderation and response generation
 * Use this for quick pre-request checks
 */
export async function checkAndRespond(
  input: string,
  config?: ModerationConfig
): Promise<{
  allowed: boolean;
  status: ModerationStatus;
  blockedResponse?: string;
}> {
  const status = await moderateInput(input, config);
  
  if (shouldBlock(status)) {
    return {
      allowed: false,
      status,
      blockedResponse: generateBlockedResponse(status),
    };
  }
  
  return {
    allowed: true,
    status,
  };
}



