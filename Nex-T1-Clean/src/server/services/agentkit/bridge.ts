/**
 * AgentKit → AI SDK Tool Bridge
 *
 * Converts AgentKit actions (Zod schema + Promise<string>) into
 * AI SDK 5.x-compatible Tool objects (JSON Schema + structured results).
 *
 * This bridge enables AgentKit's 100+ action providers to be registered
 * in our tool registry (toolset.ts) alongside native createTool() tools.
 *
 * Flow:
 *   AgentKit Action → zodToToolSchema() → createTool() → AI SDK Tool
 *   Execution: args → AgentKit.run(action, args) → parseAgentKitResult() → structured output
 */
import "server-only";

import type { Tool } from "ai";
import { createTool } from "@/modules/ai/tools/create-tool";
import { zodToToolSchema } from "@/modules/ai/tools/create-tool";
import { parseAgentKitResult, sanitizeToolError } from "./result-parser";
import { classifyAction, requiresHitl } from "./hitl-classifier";
import { getAgentKitInstance } from "./index";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal representation of an AgentKit action.
 * AgentKit actions expose these properties from their decorators.
 */
export interface AgentKitAction {
  /** Action name (e.g. "get_wallet_details", "native_transfer") */
  name: string;
  /** Human-readable description for the AI model */
  description: string;
  /** Zod schema defining the input parameters */
  schema: unknown;
  /** The action's invoke function — called with (agentKit, args) */
  invoke: (instance: unknown, args: unknown) => Promise<string>;
}

/**
 * Options for bridging an AgentKit action.
 */
export interface BridgeOptions {
  /** Override the tool ID (defaults to `ak_${action.name}`) */
  toolId?: string;
  /** Override the description */
  description?: string;
  /** Override the HITL classification */
  forceHitl?: boolean;
  /** Category for toolset.ts registration */
  category?: string;
}

// ============================================================================
// BRIDGE CORE
// ============================================================================

/**
 * Convert a single AgentKit action into an AI SDK Tool.
 *
 * This is the core adapter — it:
 * 1. Converts the Zod schema to JSON Schema via zodToToolSchema()
 * 2. Wraps the execute function to route through AgentKit's runtime
 * 3. Parses string results into structured objects
 * 4. Tags write actions for HITL approval
 */
export async function agentKitActionToTool(
  action: AgentKitAction,
  options?: BridgeOptions,
): Promise<{ toolId: string; tool: Tool; hitl: boolean }> {
  const toolId = options?.toolId ?? `ak_${action.name}`;
  const description = options?.description ?? action.description;
  const hitl = options?.forceHitl ?? requiresHitl(action.name);

  // Convert Zod → JSON Schema
  const schema = await zodToToolSchema(action.schema, toolId);

  const tool = createTool({
    description: hitl
      ? `${description} (Requires user approval before execution.)`
      : description,
    schema,
    execute: async (args, context) => {
      const instance = await getAgentKitInstance();
      if (!instance) {
        return {
          success: false,
          message: "AgentKit is not configured. Please set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and enable NEXT_PUBLIC_ENABLE_CDP_WALLETS.",
          error: "agentkit_not_configured",
        };
      }

      // HITL enforcement — write actions MUST NOT execute via the bridge
      // without explicit approval. The bridge is designed for read-only actions.
      // Write actions should use the hand-written tools (ak-wallet-send.ts, etc.)
      // which implement createApprovalRequest() + waitForApproval().
      if (hitl) {
        logger.warn("agentkit_bridge_write_action_blocked", {
          toolId,
          actionName: action.name,
          userId: context?.userId,
          classification: classifyAction(action.name),
        });
        return {
          success: false,
          message: `Action "${action.name}" requires user approval. Use the dedicated tool (e.g. cdp_wallet_send, cdp_wallet_swap) which enforces HITL approval.`,
          error: "hitl_not_enforced_in_bridge",
          _meta: {
            toolId,
            actionName: action.name,
            classification: "write" as const,
            hitlRequired: true,
          },
        };
      }

      try {
        const rawResult = await action.invoke(instance, args);
        const parsed = parseAgentKitResult(rawResult, action.name);

        return {
          ...parsed,
          _meta: {
            toolId,
            actionName: action.name,
            classification: classifyAction(action.name),
            hitlRequired: hitl,
          },
        };
      } catch (error) {
        const rawErr = error instanceof Error ? error.message : String(error);
        logger.error("agentkit_bridge_execute_failed", {
          toolId,
          actionName: action.name,
          error: rawErr,
        });

        return {
          success: false,
          message: sanitizeToolError(error),
          error: sanitizeToolError(error),
          _meta: {
            toolId,
            actionName: action.name,
            classification: classifyAction(action.name),
            hitlRequired: hitl,
          },
        };
      }
    },
  });

  return { toolId, tool, hitl };
}

// ============================================================================
// BATCH BRIDGE
// ============================================================================

/**
 * Bridge all actions from an AgentKit instance into AI SDK Tools.
 * Returns a map of toolId → Tool, ready for toolset.ts registration.
 */
export async function bridgeAllAgentKitActions(
  options?: {
    /** Only include actions matching these names */
    include?: Set<string>;
    /** Exclude actions matching these names */
    exclude?: Set<string>;
    /** Prefix for tool IDs (default: "ak_") */
    prefix?: string;
  },
): Promise<Map<string, { tool: Tool; hitl: boolean; actionName: string }>> {
  const instance = await getAgentKitInstance();
  if (!instance) {
    logger.warn("agentkit_bridge_no_instance", "Cannot bridge actions — AgentKit not configured.");
    return new Map();
  }

  const actions = instance.getActions() as AgentKitAction[];
  const results = new Map<string, { tool: Tool; hitl: boolean; actionName: string }>();
  const prefix = options?.prefix ?? "ak_";

  const bridgePromises = actions
    .filter((action) => {
      if (options?.include && !options.include.has(action.name)) return false;
      if (options?.exclude && options.exclude.has(action.name)) return false;
      return true;
    })
    .map(async (action) => {
      try {
        const { toolId, tool, hitl } = await agentKitActionToTool(action, {
          toolId: `${prefix}${action.name}`,
        });
        return { toolId, tool, hitl, actionName: action.name };
      } catch (error) {
        logger.error("agentkit_bridge_action_failed", {
          actionName: action.name,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

  const settled = await Promise.all(bridgePromises);

  for (const result of settled) {
    if (result) {
      results.set(result.toolId, {
        tool: result.tool,
        hitl: result.hitl,
        actionName: result.actionName,
      });
    }
  }

  logger.info("agentkit_bridge_complete", {
    totalActions: actions.length,
    bridgedCount: results.size,
    toolIds: Array.from(results.keys()),
  });

  return results;
}

/**
 * Create a lazy tool loader for a specific AgentKit action.
 * This integrates with toolset.ts's ToolLoader pattern.
 *
 * Usage in toolset.ts:
 * ```
 * ak_wallet_details: {
 *   category: "wallet",
 *   load: createAgentKitToolLoader("get_wallet_details"),
 *   enabled: () => process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS === "true",
 * }
 * ```
 */
export function createAgentKitToolLoader(
  actionName: string,
  options?: BridgeOptions,
): () => Promise<Tool> {
  let cached: Tool | null = null;

  return async () => {
    if (cached) return cached;

    const instance = await getAgentKitInstance();
    if (!instance) {
      throw new Error(`AgentKit not configured — cannot load action "${actionName}"`);
    }

    const actions = instance.getActions() as AgentKitAction[];
    const action = actions.find((a) => a.name === actionName);

    if (!action) {
      throw new Error(
        `AgentKit action "${actionName}" not found. Available: ${actions.map((a) => a.name).join(", ")}`,
      );
    }

    const { tool } = await agentKitActionToTool(action, options);
    cached = tool;
    return tool;
  };
}
