/**
 * Built-in Context Sources
 *
 * Defines the standard set of context sources that seed every
 * ContextSourceRegistry instance. Each source declares a cache scope,
 * priority, and resolve function.
 */

import { logger } from "@/lib/logger";
import type { CacheScope, ContextResolveInput, ContextSource } from "./types";

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function defineSource(
  name: string,
  scope: CacheScope,
  priority: number,
  resolveFn: (ctx: ContextResolveInput) => Promise<string | null>,
): ContextSource {
  return { name, scope, priority, resolve: resolveFn };
}

// ---------------------------------------------------------------------------
// Built-in sources (ordered by priority)
// ---------------------------------------------------------------------------

/** Base system prompt — foundational instruction set. Scope: global. Priority: 0 */
const systemPromptSource = defineSource(
  "system-prompt",
  "global",
  0,
  async () => null,
);

/** Nex persona instructions — brand voice and behavioral constraints. Scope: global. Priority: 10 */
const personaSource = defineSource(
  "persona",
  "global",
  10,
  async () => null,
);

/** Tool usage guidance — instructions for how to call available tools. Scope: global. Priority: 20 */
const toolGuidanceSource = defineSource(
  "tool-guidance",
  "global",
  20,
  async () => null,
);

// --- DYNAMIC BOUNDARY (inserted automatically between global and session) ---

/** Persistent memory from project memory directory. Scope: session. Priority: 100 */
const memorySource = defineSource(
  "memory",
  "session",
  100,
  async (ctx) => {
    if (!ctx.projectRoot) return null;
    try {
      const { getMemoryDir, readIndex, buildMemoryPrompt } = await import(
        "@/modules/chat/middleware/memory"
      );
      const memoryDir = getMemoryDir(ctx.projectRoot);
      const indexContent = await readIndex(memoryDir);
      if (!indexContent.trim()) return null;
      return buildMemoryPrompt(indexContent);
    } catch (err) {
      logger.warn("[context-source:memory] Failed to resolve memory", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },
);

/** Automation preferences — user's automation/approval settings. Scope: session. Priority: 110 */
const automationStateSource = defineSource(
  "automation-state",
  "session",
  110,
  async (ctx) => {
    if (!ctx.userId) return null;
    try {
      const { resolveAutomationState } = await import(
        "@/modules/chat/resolve-automation-state"
      );
      const { summarizeAutomationPreferences } = await import(
        "@/modules/chat/automation-preferences"
      );
      const state = await resolveAutomationState({
        explicit: null,
        userId: ctx.userId,
      });
      const summary = summarizeAutomationPreferences(state);
      if (!summary.directive) return null;
      return summary.directive;
    } catch (err) {
      logger.warn("[context-source:automation-state] Failed to resolve", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },
);

/** Agent wallet context — on-chain wallet state. Scope: session. Priority: 120 */
const agentContextSource = defineSource(
  "agent-context",
  "session",
  120,
  async (ctx) => {
    if (!ctx.accessToken && !ctx.userId) return null;
    try {
      const { buildWalletSnapshotPrompt } = await import(
        "@/server/profile/profile-aggregate"
      );
      const snapshot = await buildWalletSnapshotPrompt({
        accessToken: ctx.accessToken,
        userId: ctx.userId,
        profile: null,
      });
      return snapshot;
    } catch (err) {
      logger.warn("[context-source:agent-context] Failed to resolve wallet context", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },
);

/** MCP server instructions. Scope: turn. Priority: 200 */
const mcpInstructionsSource = defineSource(
  "mcp-instructions",
  "turn",
  200,
  async (ctx) => {
    if (ctx.enabledMcpServers.length === 0) return null;
    return null;
  },
);

/** Loaded skill prompts — context from activated skills. Scope: turn. Priority: 210 */
const skillsContextSource = defineSource(
  "skills-context",
  "turn",
  210,
  async () => null,
);

/** Runtime capability summary. Scope: turn. Priority: 220 */
const runtimeCapabilitiesSource = defineSource(
  "runtime-capabilities",
  "turn",
  220,
  async () => null,
);

/** All built-in sources in registration order. */
export const BUILT_IN_SOURCES: readonly ContextSource[] = [
  systemPromptSource,
  personaSource,
  toolGuidanceSource,
  memorySource,
  automationStateSource,
  agentContextSource,
  mcpInstructionsSource,
  skillsContextSource,
  runtimeCapabilitiesSource,
];
