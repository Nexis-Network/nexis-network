/**
 * Reasoning Enhancement Module
 * 
 * Domain: AI
 * Responsibility: Enhances GPT-5.1 reasoning_effort with summaries, verification, and structured output
 * Depends on: intent-classifier
 * Notes: Implements OpenAI's reasoning best practices from documentation.
 *        Key principles: Let model think, verify outputs, extract summaries.
 *        Reference: https://platform.openai.com/docs/guides/reasoning-best-practices
 */

import type { ReasoningEffort, IntentClassification } from "@/modules/chat/intent-classifier";


import { logger } from '@/lib/logger';
/**
 * Reasoning summary extracted from model output
 */
export type ReasoningSummary = {
  /** Brief summary of the reasoning process */
  summary: string;
  /** Key steps taken during reasoning */
  steps: string[];
  /** Confidence level (0-1) */
  confidence: number;
  /** Whether verification was performed */
  verified: boolean;
  /** Any caveats or limitations identified */
  caveats: string[];
  /** Sources or evidence used */
  sources: string[];
};

/**
 * Verification result for reasoning output
 */
export type VerificationResult = {
  /** Whether the output passed verification */
  passed: boolean;
  /** Verification checks performed */
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  /** Overall confidence score */
  confidence: number;
  /** Suggested improvements */
  suggestions: string[];
};

/**
 * Structured reasoning configuration
 */
export type ReasoningConfig = {
  /** The reasoning effort level */
  effort: ReasoningEffort;
  /** Whether to include step-by-step breakdown */
  includeSteps: boolean;
  /** Whether to perform verification */
  verify: boolean;
  /** Whether to extract summary */
  extractSummary: boolean;
  /** Maximum reasoning steps */
  maxSteps: number;
  /** Whether to show reasoning to user */
  exposeReasoning: boolean;
};

/**
 * Default reasoning configurations by effort level
 */
const DEFAULT_CONFIGS: Record<ReasoningEffort, ReasoningConfig> = {
  none: {
    effort: "none",
    includeSteps: false,
    verify: false,
    extractSummary: false,
    maxSteps: 0,
    exposeReasoning: false,
  },
  minimal: {
    effort: "minimal",
    includeSteps: false,
    verify: false,
    extractSummary: false,
    maxSteps: 1,
    exposeReasoning: false,
  },
  low: {
    effort: "low",
    includeSteps: false,
    verify: false,
    extractSummary: false,
    maxSteps: 2,
    exposeReasoning: false,
  },
  medium: {
    effort: "medium",
    includeSteps: true,
    verify: true,
    extractSummary: true,
    maxSteps: 5,
    exposeReasoning: false,
  },
  high: {
    effort: "high",
    includeSteps: true,
    verify: true,
    extractSummary: true,
    maxSteps: 10,
    exposeReasoning: true,
  },
  maximum: {
    effort: "maximum",
    includeSteps: true,
    verify: true,
    extractSummary: true,
    maxSteps: 20,
    exposeReasoning: true,
  },
};

/**
 * Gets the reasoning configuration for an intent classification
 */
export function getReasoningConfig(
  classification: IntentClassification,
  overrides?: Partial<ReasoningConfig>
): ReasoningConfig {
  const effort = classification.reasoningEffort ?? "medium";
  const baseConfig = DEFAULT_CONFIGS[effort];
  return {
    ...baseConfig,
    ...overrides,
  };
}

/**
 * Builds reasoning instructions for the system prompt
 * Based on GPT-5.1 reasoning best practices
 */
export function buildReasoningInstructions(config: ReasoningConfig): string {
  if (config.effort === "none") {
    return `<reasoning_instructions effort="none">
FAST EXECUTION MODE: No explicit reasoning required.
- Execute immediately on clear intents
- Direct tool calls without deliberation
- Skip verification for standard operations
</reasoning_instructions>`;
  }

  if (config.effort === "low") {
    return `<reasoning_instructions effort="low">
BRIEF REASONING MODE: Quick validation only.
- One-line internal check if needed
- Execute promptly after validation
- Verify only if ambiguous inputs
- Max ${config.maxSteps} reasoning steps
</reasoning_instructions>`;
  }

  if (config.effort === "medium") {
    return `<reasoning_instructions effort="medium">
STRUCTURED REASONING MODE: Methodical approach.
<reasoning_steps>
1. UNDERSTAND: Parse the request and identify key requirements
2. PLAN: Outline approach and tool sequence
3. EXECUTE: Perform actions systematically
4. VERIFY: Check outputs against requirements
5. SUMMARIZE: Concise outcome statement
</reasoning_steps>

<guidelines>
- Max ${config.maxSteps} reasoning steps
- Verify inputs before external calls
- Check output format meets expectations
- Flag any assumptions made
</guidelines>
</reasoning_instructions>`;
  }

  // High effort
  return `<reasoning_instructions effort="high">
DEEP REASONING MODE: Comprehensive analysis required.

<reasoning_framework>
1. DECOMPOSE: Break complex problem into sub-problems
2. ANALYZE: Examine each component thoroughly
3. SYNTHESIZE: Combine findings into coherent solution
4. VERIFY: Multi-step validation of conclusions
5. REFLECT: Consider edge cases and alternatives
6. DOCUMENT: Clear audit trail of reasoning
</reasoning_framework>

<verification_requirements>
- Validate all factual claims against sources
- Cross-reference data points when possible
- Flag uncertainty levels explicitly
- Consider counter-arguments
- Test edge cases mentally
</verification_requirements>

<output_requirements>
- Expose key reasoning steps to user
- Cite sources for factual claims
- Quantify confidence where applicable
- Note any caveats or limitations
- Max ${config.maxSteps} reasoning steps
</output_requirements>
</reasoning_instructions>`;
}

/**
 * Builds verification prompts based on reasoning effort
 */
export function buildVerificationPrompt(config: ReasoningConfig): string | null {
  if (!config.verify) {
    return null;
  }

  return `<verification_checklist>
Before finalizing your response, verify:
${config.effort === "medium" 
  ? `□ Tool outputs are valid and current
□ Response addresses the user's actual question
□ Numerical data is formatted correctly
□ Sources are cited where applicable`
  : `□ All factual claims are supported by evidence
□ Tool outputs are valid, current, and cross-referenced
□ Response fully addresses the user's question
□ Numerical data is accurate and properly formatted
□ Edge cases have been considered
□ Assumptions are stated explicitly
□ Confidence levels are appropriate
□ Sources are cited for all external claims
□ No contradictory statements exist
□ Response is actionable and complete`
}
</verification_checklist>`;
}

/**
 * Extracts a reasoning summary from model output
 * Parses structured reasoning blocks if present
 */
export function extractReasoningSummary(
  output: string,
  config: ReasoningConfig
): ReasoningSummary | null {
  if (!config.extractSummary) {
    return null;
  }

  const summary: ReasoningSummary = {
    summary: "",
    steps: [],
    confidence: 0.5,
    verified: false,
    caveats: [],
    sources: [],
  };

  // Extract thinking block if present
  const thinkingMatch = output.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkingMatch) {
    const thinkingContent = thinkingMatch[1];
    
    // Extract steps
    const stepMatches = thinkingContent.match(/(?:step\s*\d+|•|\-)\s*:?\s*(.+)/gi);
    if (stepMatches) {
      summary.steps = stepMatches.map(s => s.replace(/^(?:step\s*\d+|•|\-)\s*:?\s*/i, "").trim());
    }
  }

  // Extract summary if present
  const summaryMatch = output.match(/<summary>([\s\S]*?)<\/summary>/i);
  if (summaryMatch) {
    summary.summary = summaryMatch[1].trim();
  } else {
    // Use first sentence as summary
    const firstSentence = output.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
      summary.summary = firstSentence[0].trim();
    }
  }

  // Extract confidence if present
  const confidenceMatch = output.match(/confidence[:\s]+(\d+(?:\.\d+)?%?)/i);
  if (confidenceMatch) {
    const value = parseFloat(confidenceMatch[1].replace("%", ""));
    summary.confidence = value > 1 ? value / 100 : value;
  }

  // Extract caveats
  const caveatMatches = output.match(/(?:caveat|limitation|note|warning)[:\s]+([^.\n]+)/gi);
  if (caveatMatches) {
    summary.caveats = caveatMatches.map(c => 
      c.replace(/^(?:caveat|limitation|note|warning)[:\s]+/i, "").trim()
    );
  }

  // Extract sources
  const sourceMatches = output.match(/\[([^\]]+)\]/g);
  if (sourceMatches) {
    summary.sources = [...new Set(sourceMatches.map(s => s.slice(1, -1)))];
  }

  // Check if verified
  summary.verified = /(?:verified|validated|confirmed)/i.test(output);

  return summary;
}

/**
 * Verifies reasoning output against expected criteria
 */
export function verifyReasoningOutput(
  output: string,
  config: ReasoningConfig,
  context?: {
    expectedFormat?: "text" | "json" | "code" | "table";
    mustIncludeSources?: boolean;
    minConfidence?: number;
  }
): VerificationResult {
  const checks: VerificationResult["checks"] = [];
  const suggestions: string[] = [];

  // Check 1: Response not empty
  const hasContent = output.trim().length > 10;
  checks.push({
    name: "has_content",
    passed: hasContent,
    message: hasContent ? "Response has content" : "Response is empty or too short",
  });

  // Check 2: No refusal/inability statements (unless appropriate)
  const hasRefusal = /(?:i cannot|i'm unable|i can't|sorry.*cannot)/i.test(output);
  if (hasRefusal) {
    checks.push({
      name: "no_refusal",
      passed: false,
      message: "Response contains refusal language",
    });
    suggestions.push("Review if refusal is necessary or if task can be attempted");
  } else {
    checks.push({
      name: "no_refusal",
      passed: true,
      message: "No unnecessary refusals",
    });
  }

  // Check 3: Sources cited if required
  if (context?.mustIncludeSources) {
    const hasSources = /\[[^\]]+\]/.test(output);
    checks.push({
      name: "has_sources",
      passed: hasSources,
      message: hasSources ? "Sources are cited" : "Missing source citations",
    });
    if (!hasSources) {
      suggestions.push("Add source citations for factual claims");
    }
  }

  // Check 4: Expected format
  if (context?.expectedFormat === "json") {
    const hasJson = /```json[\s\S]*```/.test(output) || /^\s*\{[\s\S]*\}\s*$/.test(output);
    checks.push({
      name: "format_json",
      passed: hasJson,
      message: hasJson ? "JSON format present" : "Expected JSON format not found",
    });
  }

  if (context?.expectedFormat === "code") {
    const hasCode = /```[\w]*[\s\S]*```/.test(output);
    checks.push({
      name: "format_code",
      passed: hasCode,
      message: hasCode ? "Code block present" : "Expected code format not found",
    });
  }

  // Check 5: No contradictions (basic check)
  const hasContradiction = 
    output.includes("but also") && output.includes("however") && output.includes("on the other hand");
  if (hasContradiction) {
    checks.push({
      name: "no_contradictions",
      passed: false,
      message: "Potential contradictory statements detected",
    });
    suggestions.push("Review response for internal consistency");
  }

  // Check 6: Completeness (for high effort)
  if (config.effort === "high") {
    const hasConclusion = /(?:in conclusion|to summarize|therefore|thus)/i.test(output);
    checks.push({
      name: "has_conclusion",
      passed: hasConclusion,
      message: hasConclusion ? "Conclusion present" : "Missing explicit conclusion",
    });
    if (!hasConclusion) {
      suggestions.push("Add a clear conclusion or summary statement");
    }
  }

  // Calculate overall confidence
  const passedCount = checks.filter(c => c.passed).length;
  const confidence = checks.length > 0 ? passedCount / checks.length : 0;

  return {
    passed: confidence >= 0.7,
    checks,
    confidence,
    suggestions,
  };
}

/**
 * Builds a prompt suffix for structured reasoning output
 */
export function buildStructuredReasoningPrompt(config: ReasoningConfig): string {
  if (config.effort === "none" || config.effort === "low") {
    return "";
  }

  return `
<output_structure>
When providing complex analysis, structure your response as:

${config.exposeReasoning ? `<thinking>
[Your step-by-step reasoning process]
</thinking>

` : ""}**Result**: [Direct answer or outcome]

${config.effort === "high" ? `**Evidence**: [Supporting data/sources]

**Confidence**: [High/Medium/Low with brief justification]

**Caveats**: [Any limitations or assumptions]
` : ""}
</output_structure>`;
}

/**
 * Determines if streaming reasoning should be enabled
 * Based on model, route, and user preferences
 */
export function shouldStreamReasoning(
  config: ReasoningConfig,
  options: {
    tierRoute?: string;
    modelId?: string;
    userPreference?: "always" | "never" | "auto";
  } = {}
): boolean {
  const { tierRoute, modelId, userPreference = "auto" } = options;

  // User preference overrides
  if (userPreference === "always") return true;
  if (userPreference === "never") return false;

  // Never stream for none/low effort
  if (config.effort === "none" || config.effort === "low") {
    return false;
  }

  // Stream for non-chat routes (research, analysis, etc.)
  if (tierRoute && tierRoute !== "chat") {
    return true;
  }

  // Stream for thinking/reasoning models
  if (modelId) {
    const isThinkingModel = modelId.includes("thinking") || 
                           modelId.includes("reasoning") ||
                           modelId.includes("5.1");
    if (isThinkingModel) {
      return true;
    }
  }

  // Default: stream for high effort
  return config.effort === "high";
}

/**
 * Post-processes model output to extract and format reasoning
 */
export function postProcessReasoning(
  output: string,
  config: ReasoningConfig
): {
  processedOutput: string;
  reasoning?: ReasoningSummary;
  verification?: VerificationResult;
} {
  let processedOutput = output;
  let reasoning: ReasoningSummary | undefined;
  let verification: VerificationResult | undefined;

  // Extract reasoning summary if configured
  if (config.extractSummary) {
    const summary = extractReasoningSummary(output, config);
    if (summary) {
      reasoning = summary;
    }
  }

  // Verify output if configured
  if (config.verify) {
    verification = verifyReasoningOutput(output, config);
    
    // Add verification note if failed
    if (!verification.passed && verification.suggestions.length > 0) {
      // Log for monitoring, don't modify output
      logger.warn("[reasoning] Verification warnings:", verification.suggestions);
    }
  }

  // Strip thinking blocks if not exposing reasoning
  if (!config.exposeReasoning) {
    processedOutput = output
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
      .trim();
  }

  return {
    processedOutput,
    reasoning,
    verification,
  };
}

/**
 * Calculates effective reasoning parameters for API call
 */
export function buildReasoningApiParams(
  config: ReasoningConfig
): Record<string, UntypedJson> {
  if (config.effort === "none") {
    return {};
  }

  return {
    reasoning: {
      effort: config.effort,
    },
  };
}



