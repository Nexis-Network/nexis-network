/**
 * Context Assembly Enhancer
 *
 * Integrates persistent memory, prompt caching boundaries, and
 * context provenance tracking into the existing PromptFactory pipeline.
 *
 * System reminder utilities are in system-reminder.ts.
 * Provenance tracking is in provenance.ts.
 */

import { getMemoryDir, readIndex, buildMemoryPrompt } from "./memory";
import { logger } from "@/lib/logger";
import type { SessionCostSummary } from "./cost-tracker";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY, wrapInSystemReminder } from "./system-reminder";
import { ProvenanceCollector } from "./provenance";
import type { CacheScope, ContextProvenanceEntry } from "./provenance";

// ---------------------------------------------------------------------------
// Re-exports for barrel compatibility
// ---------------------------------------------------------------------------

export { SYSTEM_PROMPT_DYNAMIC_BOUNDARY, splitPromptAtBoundary, wrapInSystemReminder } from "./system-reminder";
export { ProvenanceCollector } from "./provenance";
export type { CacheScope, ContextProvenanceEntry } from "./provenance";

export type PromptSection = {
  content: string;
  scope: CacheScope;
  source: string;
};

// ---------------------------------------------------------------------------
// Memory-Enhanced Context Assembly
// ---------------------------------------------------------------------------

/**
 * Enhances the existing system prompt with persistent memory.
 * Returns the enhanced system prompt with memory injected in the
 * dynamic section (to avoid busting the static cache).
 */
export async function enhanceWithMemory(
  systemPrompt: string,
  projectRoot: string,
  provenance?: ProvenanceCollector,
): Promise<{ enhancedPrompt: string; memoryInjected: boolean }> {
  try {
    const memoryDir = getMemoryDir(projectRoot);
    const indexContent = await readIndex(memoryDir);

    if (!indexContent.trim()) {
      return { enhancedPrompt: systemPrompt, memoryInjected: false };
    }

    const memoryPrompt = buildMemoryPrompt(indexContent);

    provenance?.record({
      source: "persistent_memory",
      scope: "session",
      sizeChars: memoryPrompt.length,
      injectedAt: new Date().toISOString(),
    });

    const enhanced =
      systemPrompt + SYSTEM_PROMPT_DYNAMIC_BOUNDARY + memoryPrompt;
    return { enhancedPrompt: enhanced, memoryInjected: true };
  } catch (error) {
    logger.warn("Failed to enhance prompt with persistent memory", {
      projectRoot,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enhancedPrompt: systemPrompt, memoryInjected: false };
  }
}

// ---------------------------------------------------------------------------
// Full Context Enhancement Pipeline
// ---------------------------------------------------------------------------

export type ContextEnhancementOptions = {
  projectRoot: string;
  sessionId: string | null;
  userId: string | null;
  currentDate?: string;
  costSummary?: SessionCostSummary | null;
  gitStatus?: string | null;
};

/**
 * Full context enhancement pipeline.
 * Applies all enterprise context features to an existing system prompt.
 *
 * This function is safe for concurrent use -- it creates a per-request
 * provenance collector rather than mutating shared module state.
 */
export async function enhanceContext(
  systemPrompt: string,
  options: ContextEnhancementOptions,
): Promise<{
  enhancedSystemPrompt: string;
  userContextMessage: string;
  provenanceEntries: readonly ContextProvenanceEntry[];
}> {
  const provenance = new ProvenanceCollector();

  provenance.record({
    source: "system_prompt",
    scope: "global",
    sizeChars: systemPrompt.length,
    injectedAt: new Date().toISOString(),
  });

  const { enhancedPrompt } = await enhanceWithMemory(
    systemPrompt,
    options.projectRoot,
    provenance,
  );

  const userContext: Record<string, string> = {};

  if (options.currentDate) {
    userContext.currentDate = `Today's date is ${options.currentDate}.`;
  }

  if (options.gitStatus) {
    userContext.gitStatus = options.gitStatus;
  }

  if (options.costSummary) {
    userContext.sessionCost = [
      `Session cost: $${options.costSummary.totalCostUsd.toFixed(4)}`,
      `Tokens: ${options.costSummary.totalInputTokens} in / ${options.costSummary.totalOutputTokens} out`,
      `Cache hit rate: ${(options.costSummary.cacheHitRate * 100).toFixed(1)}%`,
    ].join("\n");
  }

  const userContextMessage = wrapInSystemReminder(userContext);

  if (userContextMessage) {
    provenance.record({
      source: "user_context",
      scope: "turn",
      sizeChars: userContextMessage.length,
      injectedAt: new Date().toISOString(),
    });
  }

  return {
    enhancedSystemPrompt: enhancedPrompt,
    userContextMessage,
    provenanceEntries: provenance.getEntries(),
  };
}
