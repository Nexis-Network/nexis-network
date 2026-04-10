/**
 * Metaprompts Module Index
 * 
 * Domain: AI/Metaprompts
 * Responsibility: Assembles GPT-5.4 structured prompts for Nex-T1
 * Depends on: All metaprompt submodules
 * Notes: Central export point for metaprompt assembly and configuration
 */

import type { IntentClassification, IntentCategory } from "@/modules/chat/intent-classifier";
import { buildToolPlanningHint } from "./tool-planning";
import { DOCUMENT_CANVAS_GUIDE } from "./document-canvas-guide";
import {
  getVerbosityInstructions,
  getVerbosityLevel,
  getMaxTokensForVerbosity,
} from "./verbosity-spec";

// Export all metaprompt sections
export { NEX_PERSONA, getPersonaAdjustments, type PersonaContext } from "./nex-persona";
export {
  VERBOSITY_SPEC,
  getVerbosityLevel,
  getVerbosityInstructions,
  getMaxTokensForVerbosity,
  type VerbosityLevel,
} from "./verbosity-spec";
export {
  TOOL_PLANNING_SPEC,
  getToolPlanningMode,
  buildToolPlanningHint,
  TOOL_CATEGORIES,
  type ToolPlanningMode,
  type ToolCategory,
} from "./tool-planning";
export {
  USER_UPDATES_SPEC,
  generateUserUpdate,
  shouldSendUpdate,
  createProgressEvent,
  type UpdateType,
  type UserUpdate,
  type ProgressEvent,
} from "./user-updates";
export {
  FINAL_ANSWER_SPEC,
  getAnswerStructure,
  formatToolResultForUser,
  buildCitation,
  validateFinalAnswer,
  type AnswerStructure,
} from "./final-answer";
export {
  ARTIFACT_USAGE_GUIDE,
  ARTIFACT_TYPES,
  isValidArtifactType,
  suggestArtifactType,
  buildArtifactBlock,
  type ArtifactType,
} from "./artifact-guide";
export { DOCUMENT_CANVAS_GUIDE } from "./document-canvas-guide";

/**
 * GPT-5.4 Reasoning Effort levels
 * Maps to the reasoning_effort parameter in the API
 */
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "maximum";

/**
 * Maps ThinkingMode to GPT-5.4 reasoning_effort
 */
export function mapThinkingModeToReasoningEffort(
  thinkingMode: "none" | "minimal" | "standard" | "deep"
): ReasoningEffort {
  const mapping: Record<string, ReasoningEffort> = {
    none: "none",
    minimal: "low",
    standard: "medium",
    deep: "high",
  };
  return mapping[thinkingMode] ?? "medium";
}

/**
 * Gets reasoning effort directly from intent category
 */
export function getReasoningEffortForIntent(category: IntentCategory): ReasoningEffort {
  const effortMap: Record<IntentCategory, ReasoningEffort> = {
    greeting: "none",
    price_check: "none",
    balance_check: "none",
    wallet_create: "none",
    wallet_action: "low",
    trending: "none",
    market_data: "low",
    research: "high",
    analysis: "high",
    general_question: "medium",
    conversation: "low",
    complex_task: "high",
    smart_contract: "high",
    degen_trading: "medium",
    // New categories
    nft: "low",
    image_generation: "low",
    trading: "medium",
    defi: "medium",
    defi_swap: "medium",
    defi_yield: "medium",
    defi_liquidity: "medium",
    general: "low",
    task_scheduling: "medium",
    code_generation: "high",
    document_analysis: "high",
  };
  return effortMap[category] ?? "medium";
}

/**
 * Configuration for metaprompt assembly
 */
export type MetapromptConfig = {
  includePersona?: boolean;
  includeVerbosity?: boolean;
  includeToolPlanning?: boolean;
  includeUserUpdates?: boolean;
  includeFinalAnswer?: boolean;
  includeArtifactGuide?: boolean;
  includeDocumentCanvasGuide?: boolean;
  reasoningEffort?: ReasoningEffort;
  verbosityOverride?: string;
};

export type MetapromptTemplates = Partial<{
  persona: string;
  verbosity: string;
  toolPlanning: string;
  userUpdates: string;
  finalAnswer: string;
  artifactGuide: string;
  documentCanvasGuide: string;
}>;

const DEFAULT_CONFIG: Required<MetapromptConfig> = {
  includePersona: true,
  includeVerbosity: true,
  includeToolPlanning: true,
  includeUserUpdates: true,
  includeFinalAnswer: true,
  includeArtifactGuide: true,
  includeDocumentCanvasGuide: true,
  reasoningEffort: "medium",
  verbosityOverride: "",
};

/**
 * Assembles metaprompt sections based on configuration
 */
export function assembleMetaprompts(config: MetapromptConfig = {}, templates: MetapromptTemplates = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const sections: string[] = [];

  // Import sections dynamically to avoid circular deps at module load
  if (finalConfig.includePersona) {
    const persona = templates.persona;
    if (persona) {
      sections.push(persona.trim());
    } else {
      const { NEX_PERSONA } = require("./nex-persona");
      sections.push(NEX_PERSONA);
    }
  }

  if (finalConfig.includeVerbosity) {
    const verbosity = templates.verbosity;
    if (verbosity) {
      sections.push(verbosity.trim());
    } else {
      const { VERBOSITY_SPEC } = require("./verbosity-spec");
      sections.push(VERBOSITY_SPEC);
    }
    if (finalConfig.verbosityOverride) {
      sections.push(`<verbosity_override>${finalConfig.verbosityOverride}</verbosity_override>`);
    }
  }

  if (finalConfig.includeToolPlanning) {
    const toolPlanning = templates.toolPlanning;
    if (toolPlanning) {
      sections.push(toolPlanning.trim());
    } else {
      const { TOOL_PLANNING_SPEC } = require("./tool-planning");
      sections.push(TOOL_PLANNING_SPEC);
    }
  }

  if (finalConfig.includeUserUpdates) {
    const userUpdates = templates.userUpdates;
    if (userUpdates) {
      sections.push(userUpdates.trim());
    } else {
      const { USER_UPDATES_SPEC } = require("./user-updates");
      sections.push(USER_UPDATES_SPEC);
    }
  }

  if (finalConfig.includeFinalAnswer) {
    const finalAnswer = templates.finalAnswer;
    if (finalAnswer) {
      sections.push(finalAnswer.trim());
    } else {
      const { FINAL_ANSWER_SPEC } = require("./final-answer");
      sections.push(FINAL_ANSWER_SPEC);
    }
  }

  if (finalConfig.includeArtifactGuide) {
    const artifactGuide = templates.artifactGuide;
    if (artifactGuide) {
      sections.push(artifactGuide.trim());
    } else {
      const { ARTIFACT_USAGE_GUIDE } = require("./artifact-guide");
      sections.push(ARTIFACT_USAGE_GUIDE);
    }
  }

  if (finalConfig.includeDocumentCanvasGuide) {
    const docGuide = templates.documentCanvasGuide;
    if (docGuide) {
      sections.push(docGuide.trim());
    } else {
      sections.push(DOCUMENT_CANVAS_GUIDE);
    }
  }

  // Add reasoning effort instruction
  if (finalConfig.reasoningEffort) {
    sections.push(buildReasoningEffortInstruction(finalConfig.reasoningEffort));
  }

  return sections.join("\n\n");
}

/**
 * Builds a reasoning effort instruction for the prompt
 */
function buildReasoningEffortInstruction(effort: ReasoningEffort): string {
  const instructions: Record<ReasoningEffort, string> = {
    none: `<reasoning_mode>
REASONING: NONE. Execute immediately. No visible chain-of-thought. Direct tool calls for clear intents.
</reasoning_mode>`,
    minimal: `<reasoning_mode>
REASONING: MINIMAL. Quick sanity check only. Execute immediately after brief validation.
</reasoning_mode>`,
    low: `<reasoning_mode>
REASONING: LOW. Brief internal check. Execute quickly. Validate only if ambiguous.
</reasoning_mode>`,
    medium: `<reasoning_mode>
REASONING: MEDIUM. Structured approach. Verify inputs. Plan tool sequence. Refresh stale reads when needed. Check outputs.
</reasoning_mode>`,
    high: `<reasoning_mode>
REASONING: HIGH. Deeper analysis. Use research mode when applicable. Multi-step verification. Consider edge cases. Validate critical claims.
</reasoning_mode>`,
    maximum: `<reasoning_mode>
REASONING: MAXIMUM. Deep analysis. Exhaustive verification. Resolve contradictions and summarize trade-offs succinctly (no raw chain-of-thought).
</reasoning_mode>`,
  };

  return instructions[effort];
}

/**
 * Builds metaprompts optimized for a specific intent classification
 */
export function buildMetapromptsForIntent(
  classification: IntentClassification,
  templates: MetapromptTemplates = {}
): {
  metaprompts: string;
  reasoningEffort: ReasoningEffort;
  maxTokens: number | undefined;
} {
  const reasoningEffort = getReasoningEffortForIntent(classification.category);
  const verbosityLevel = getVerbosityLevel(classification.category);
  const maxTokens = getMaxTokensForVerbosity(verbosityLevel);

  const verbosityOverride = getVerbosityInstructions(verbosityLevel);
  const toolHint = buildToolPlanningHint(classification.category, classification.suggestedTools);

  const isFastPath = Boolean(classification.fastPathEligible);
  const needsToolPlanningInFastPath = ["wallet_create", "balance_check"].includes(classification.category);
  const needsArtifactsInFastPath = classification.category === "wallet_create";

  const metaprompts = assembleMetaprompts({
    reasoningEffort,
    verbosityOverride: `${verbosityOverride}\n${toolHint}`,
    // For fast intents, skip heavy sections to reduce latency/context size.
    includeUserUpdates: !isFastPath,
    includeToolPlanning: !isFastPath || needsToolPlanningInFastPath,
    includeFinalAnswer: !isFastPath,
    includeArtifactGuide: !isFastPath || needsArtifactsInFastPath,
    includeDocumentCanvasGuide: !isFastPath,
  }, templates);

  return {
    metaprompts,
    reasoningEffort,
    maxTokens,
  };
}
