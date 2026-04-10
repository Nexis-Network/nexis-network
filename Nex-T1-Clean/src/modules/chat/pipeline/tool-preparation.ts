import { z } from "zod";
import type { Tool } from "ai";

import { loadToolsByIds } from "@/modules/ai/chatbot/toolset";
import type { ChatAgentRequest } from "@/modules/chat/types";
import type { PipelineContext } from "@/modules/chat/pipeline/context-builder";
import type { ChatPipelineRuntimePlan } from "@/modules/chat/pipeline/runtime-plan";
import { ToolController } from "@/modules/chat/tool-runner";
import type { TraceContext } from "@/modules/chat/langfuse-tracing";
import { loadAiSdkMcpTools } from "@/server/mcp/ai-sdk-mcp-tools";
import { preValidateToolsForStream } from "@/lib/tools/schema-validation";
import { sanitizeToolsForStream } from "@/modules/chat/pipeline/tool-sanitizer";
import { filterUnsafeTools } from "@/modules/chat/pipeline/tool-safety-filter";
import { applyToolCachePolicy } from "@/modules/chat/pipeline/tool-cache-policy";
import { resolveToolBudget } from "@/lib/constants/billing-limits";

import { logger } from "@/lib/logger";

type PrepareRuntimeToolsArgs = {
  auth: {
    userId?: string | null;
  };
  context: PipelineContext;
  emitEvent: (type: string, data: UntypedJson) => void;
  request: ChatAgentRequest;
  resolvedModel: string;
  runtimePlan: ChatPipelineRuntimePlan;
  submissionId?: string;
  traceContext?: TraceContext | null;
};

export type PreparedToolset = {
  cachedTools: Record<string, Tool>;
  coreToolCount: number;
  mcpToolCount: number;
  safeToolCount: number;
  cachedToolCount: number;
  mcpClose: () => Promise<void>;
};

function injectE2bMcpWrapper(args: {
  combinedToolset: Record<string, Tool>;
  context: PipelineContext;
}): Record<string, Tool> {
  const { combinedToolset, context } = args;
  if (!combinedToolset.e2b_start_mcp_server) {
    return combinedToolset;
  }

  const originalStart = combinedToolset.e2b_start_mcp_server;
  logger.debug("[pipeline] Wrapping e2b_start_mcp_server for secure config injection");

  return {
    ...combinedToolset,
    e2b_start_mcp_server: {
      description:
        "Start an enabled MCP server by name. The system handles API keys and configuration automatically.",
      parameters: z.object({
        serverName: z
          .string()
          .describe("The name of the MCP server to start (e.g. 'google-maps', 'memory')"),
        sandboxID: z.string().optional().describe("Sandbox ID if already running"),
      }),
      execute: async (toolArgs: { serverName: string; sandboxID?: string }) => {
        const { serverName, sandboxID } = toolArgs;
        logger.debug(`[pipeline] start_mcp_server wrapper called for: ${serverName}`);

        const config = context.enabledMcpServers?.find((entry) => entry.name === serverName);
        if (!config) {
          return {
            success: false,
            error: `Server '${serverName}' is not enabled or not found in your configuration.`,
          };
        }
        if (!config.command) {
          return {
            success: false,
            error: `Server '${serverName}' has no startup command configured.`,
          };
        }

        return (
          originalStart.execute?.(
            {
              command: config.command,
              sandboxID,
              env: config.env,
            },
            { toolCallId: "injected", messages: [] },
          ) ?? Promise.resolve({ success: false, error: "Tool execute undefined" })
        );
      },
    } as UntypedJson as Tool,
  };
}

export async function prepareRuntimeTools({
  auth,
  context,
  emitEvent,
  request,
  resolvedModel,
  runtimePlan,
  submissionId,
  traceContext,
}: PrepareRuntimeToolsArgs): Promise<PreparedToolset> {
  const toolBudget = resolveToolBudget(context.userPlan);
  context.contextEnvelope.budget = {
    ...context.contextEnvelope.budget,
    toolMaxInvocations: toolBudget.maxInvocations,
    toolMaxConcurrent: toolBudget.maxConcurrent,
  };

  const toolController = new ToolController({
    emitEvent,
    traceContext,
    sandboxID: context.sandboxId ?? undefined,
    maxInvocations: toolBudget.maxInvocations,
    maxConcurrent: toolBudget.maxConcurrent,
    userId: auth.userId ?? undefined,
    sessionId: request.sessionId ?? submissionId ?? undefined,
  });

  const coreToolsetPromise = loadToolsByIds(runtimePlan.toolIdsToLoad);
  const mcpPurpose = runtimePlan.mcpPurpose ?? "chat_readonly";
  const allowValueMovingMcpTools =
    runtimePlan.allowValueMovingMcpTools ?? false;
  const mcpToolsPromise = runtimePlan.shouldLoadMcpTools
    ? loadAiSdkMcpTools({
        purpose: mcpPurpose,
        allowValueMoving: allowValueMovingMcpTools,
        userId: auth.userId ?? undefined,
      }).catch(
        (error) => {
          logger.warn(
            `[pipeline] MCP tools unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
          return { tools: {}, loaded: [], close: async () => {} };
        },
      )
    : Promise.resolve({ tools: {}, loaded: [], close: async () => {} });

  const [toolset, mcpTools] = await Promise.all([coreToolsetPromise, mcpToolsPromise]);
  const combinedToolset = injectE2bMcpWrapper({
    combinedToolset: { ...toolset, ...mcpTools.tools },
    context,
  });

  logger.debug(
    `[pipeline] Toolset loaded: core=${Object.keys(toolset).length} mcp=${Object.keys(mcpTools.tools).length} total=${Object.keys(combinedToolset).length}`,
  );

  const validatedToolset = preValidateToolsForStream(combinedToolset, resolvedModel, emitEvent);
  logger.debug(`[pipeline] After preValidate: ${Object.keys(validatedToolset).length} tools`);

  const runtimeTools = toolController.wrapToolset(validatedToolset);
  logger.debug(`[pipeline] After wrapToolset: ${Object.keys(runtimeTools).length} tools`);

  const sanitizedTools = sanitizeToolsForStream(runtimeTools, emitEvent);
  logger.debug(`[pipeline] After sanitize: ${Object.keys(sanitizedTools).length} tools`);

  const safeTools = filterUnsafeTools(sanitizedTools, emitEvent);
  logger.debug(
    `[pipeline] After filterUnsafe: ${Object.keys(safeTools).length} tools: ${Object.keys(safeTools).join(", ")}`,
  );

  const cachedTools = applyToolCachePolicy({
    tools: safeTools,
    userId: auth.userId ?? null,
    sessionId: request.sessionId ?? submissionId ?? null,
    modelId: resolvedModel,
    emitEvent,
  });
  logger.debug(`[pipeline] After tool-cache policy: ${Object.keys(cachedTools).length} tools`);

  return {
    cachedTools,
    coreToolCount: Object.keys(toolset).length,
    mcpToolCount: Object.keys(mcpTools.tools).length,
    safeToolCount: Object.keys(safeTools).length,
    cachedToolCount: Object.keys(cachedTools).length,
    mcpClose: mcpTools.close,
  };
}
