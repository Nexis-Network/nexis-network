import { createGateway, stepCountIs } from "ai";
import type { Tool } from "ai";

import { loadToolsByIds } from "@/modules/ai/chatbot/toolset";
import { ContextBuilder } from "@/modules/chat/pipeline/context-builder";
import { PromptFactory } from "@/modules/chat/pipeline/prompt-factory";
import { compactMessages } from "@/modules/chat/pipeline/message-compaction";
import { resolveModel } from "@/modules/chat/pipeline/model-resolution";
import { resolveChatProviderModel } from "@/modules/chat/pipeline/provider-model";
import { buildMorphSystemDirective } from "@/modules/chat/pipeline/morph-routing";
import {
  buildWorkflowCanvas,
  shouldEmitWorkflowVisuals,
  type WorkflowProgressUpdate,
} from "@/modules/chat/pipeline/workflow-visuals";
import { filterUnsafeTools } from "@/modules/chat/pipeline/tool-safety-filter";
import { sanitizeToolsForStream } from "@/modules/chat/pipeline/tool-sanitizer";
import { applyToolCachePolicy } from "@/modules/chat/pipeline/tool-cache-policy";
import { wrapToolWithCommandRestriction } from "@/modules/chat/agent-roles/constrained-tool-wrapper";
import { isRoleScopingEnabled, type AgentRole } from "@/modules/chat/agent-roles/tool-access-map";
import { buildChatPipelineRuntimePlan } from "@/modules/chat/pipeline/runtime-plan";
import { classifyIntent } from "@/modules/chat/intent-classifier";
import { getModelContextLimit } from "@/modules/chat/model-context-limits";
import { ToolController } from "@/modules/chat/tool-runner";
import { resolveChatRuntimeTokenBudget } from "@/modules/chat/runtime/token-budget";
import { preValidateToolsForStream } from "@/lib/tools/schema-validation";
import { resolveToolBudget } from "@/lib/constants/billing-limits";
import { loadAiSdkMcpTools } from "@/server/mcp/ai-sdk-mcp-tools";
import {
  directOpenai as directOpenAIProvider,
  directOpenaiConfig,
  hasUsableOpenAIApiKey,
} from "@/server/services/ai-sdk/openai";
import type { ChatAgentRequest } from "@/modules/chat/types";

import type { ContextEnvelope } from "@/modules/chat/context-envelope";
import { logger } from "@/lib/logger";
import {
  enhanceContext,
  shouldAutoCompact,
  microcompact,
  recordCompactionResult,
  markCompactionInProgress,
} from "@/modules/chat/middleware";
import { decomposeRequest } from "@/modules/chat/workflow/task-decomposer";
import {
  writeWorkingMemoryState,
  resolveWorkingMemoryScope,
} from "@/modules/chat/state/working-memory-store";
import { isWorkflowGatesEnabled } from "@/modules/chat/workflow/workflow-rules";
import {
  registerAppChatToolContractIds,
  registerAppChatToolContractTools,
} from "@/modules/chat/app-chat-tool-contract";

export type UnifiedChatFinishEvent = {
  totalUsage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
    cachedInputTokens?: number | undefined;
    reasoningTokens?: number | undefined;
  };
  toolCalls: Array<{ toolName?: string }>;
  steps: Array<{ toolCalls: Array<{ toolName?: string }> }>;
};

export type UnifiedChatRuntimeEventEmitter = (
  type: string,
  data: UntypedJson,
) => void;

export type UnifiedChatRuntimeOptions = {
  request: ChatAgentRequest;
  auth: {
    userId?: string | null;
    accessToken?: string | null;
  };
  emitEvent?: UnifiedChatRuntimeEventEmitter | null;
  onAgentFinish?: ((event: UnifiedChatFinishEvent) => Promise<void> | void) | null;
};

export type UnifiedChatExperimentalContext = {
  activeToolIds?: string[];
  envelope: ContextEnvelope | null;
  agentRole: string;
  mcpClose?: (() => Promise<void>) | null;
  onAgentFinish?: UnifiedChatRuntimeOptions["onAgentFinish"];
};

const gatewayApiKey =
  process.env.AI_GATEWAY_API_KEY ??
  process.env.VERCEL_AI_GATEWAY_API_KEY ??
  "";
const gatewayBaseUrl =
  process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1/ai";
const aiGateway = createGateway({
  apiKey: gatewayApiKey,
  baseURL: gatewayBaseUrl,
});

const hasDirectOpenAICompatibleProvider =
  hasUsableOpenAIApiKey(directOpenaiConfig.apiKey);

const noopEmitEvent: UnifiedChatRuntimeEventEmitter = () => {};
const NEX_CODE_TOOL_BUDGET_FLOOR = {
  maxInvocations: 24,
  maxConcurrent: 6,
} as const;
const TOOL_TURN_OUTPUT_TOKEN_FLOOR = 2048;

function getLatestUserText(
  messages: ChatAgentRequest["messages"],
): string {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (typeof latestUserMessage?.content === "string") {
    return latestUserMessage.content;
  }

  if (Array.isArray(latestUserMessage?.content)) {
    return latestUserMessage.content
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join(" ");
  }

  return "";
}

function resolveUnifiedRuntimeToolBudget(args: {
  requestModel: string | null | undefined;
  resolvedModel: string;
  runtimePlan: {
    isNexCodeModel?: boolean;
  };
  userPlan: string | null | undefined;
}) {
  const baseBudget = resolveToolBudget(args.userPlan);
  const requestedModel = (args.requestModel ?? args.resolvedModel).trim().toLowerCase();
  const isNexCodeTurn =
    args.runtimePlan.isNexCodeModel === true ||
    requestedModel === "nex-build" ||
    requestedModel.includes("nex-code");

  if (!isNexCodeTurn) {
    return baseBudget;
  }

  return {
    maxInvocations: Math.max(
      baseBudget.maxInvocations,
      NEX_CODE_TOOL_BUDGET_FLOOR.maxInvocations,
    ),
    maxConcurrent: Math.max(
      baseBudget.maxConcurrent,
      NEX_CODE_TOOL_BUDGET_FLOOR.maxConcurrent,
    ),
  };
}

function applyCommandRestrictions(
  tools: Record<string, Tool>,
  role: AgentRole,
): Record<string, Tool> {
  if (!isRoleScopingEnabled() || role === "general") {
    return tools;
  }

  const wrapped: Record<string, Tool> = {};
  for (const [name, tool] of Object.entries(tools)) {
    wrapped[name] = wrapToolWithCommandRestriction(name, tool, role);
  }
  return wrapped;
}

function resolvePromptMaxOutputTokens(args: {
  promptMaxTokens: number | undefined;
  hasLoadedTools: boolean;
}): number | undefined {
  if (typeof args.promptMaxTokens !== "number") {
    return undefined;
  }

  if (!args.hasLoadedTools) {
    return args.promptMaxTokens;
  }

  return Math.max(args.promptMaxTokens, TOOL_TURN_OUTPUT_TOKEN_FLOOR);
}

export async function buildUnifiedChatRuntime(
  options: UnifiedChatRuntimeOptions,
) {
  const emitEvent = options.emitEvent ?? noopEmitEvent;
  const { request, auth } = options;
  const submissionId = request.submissionId;
  const resolvedModel = resolveModel(request.model);
  const contextLimit = getModelContextLimit(request.model ?? resolvedModel);
  const latestUserText = getLatestUserText(request.messages);

  const initialWorkflowId =
    request.sessionId ?? submissionId ?? "chat-pipeline";

  let mcpClose: (() => Promise<void>) | null = null;

  try {
    const classification = await classifyIntent(latestUserText);
    const emitWorkflowVisuals = shouldEmitWorkflowVisuals({
      classification,
      requestedModelAlias: request.model ?? resolvedModel,
    });
    const workflowUpdates: WorkflowProgressUpdate[] = [];
    const emitWorkflowProgress = (
      workflowId: string,
      stepName: WorkflowProgressUpdate["stepName"],
      status: WorkflowProgressUpdate["status"],
      progress?: number,
    ) => {
      const update: WorkflowProgressUpdate = {
        workflowId,
        stepName,
        status,
        ...(typeof progress === "number" ? { progress } : {}),
      };

      emitEvent("workflow_update", update);

      if (!emitWorkflowVisuals) {
        return;
      }

      workflowUpdates.push(update);
      const workflowCanvas = buildWorkflowCanvas(workflowUpdates);
      if (workflowCanvas) {
        emitEvent("data-workflow-canvas", workflowCanvas as unknown as UntypedJson);
      }
    };

    emitWorkflowProgress(initialWorkflowId, "context_build", "running", 5);
    const contextBuilder = new ContextBuilder(request, auth);
    const context = await contextBuilder.build();
    const workflowId = context.contextEnvelope.turnId ?? initialWorkflowId;

    emitWorkflowProgress(workflowId, "context_build", "completed", 15);

    // Decompose multi-concern requests into discrete tasks when workflow
    // gates are enabled. This seeds working memory so downstream gates
    // can track per-task prerequisites.
    if (isWorkflowGatesEnabled() && latestUserText) {
      const tasks = decomposeRequest(latestUserText, context.contextEnvelope.turnId);
      if (tasks.length > 1) {
        const scope = resolveWorkingMemoryScope({
          userId: auth.userId ?? undefined,
          sessionId: request.sessionId ?? undefined,
        });
        const now = new Date().toISOString();
        await writeWorkingMemoryState(scope, {
          todos: tasks.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
          updatedAt: now,
        });
      }
    }

    const activeTask = context.memorySnapshot.workingState.todos.find(
      (todo) => todo.id === context.contextEnvelope.memory.activeTaskId,
    );

    if (activeTask) {
      emitEvent("task_update", {
        taskId: activeTask.id,
        title: activeTask.title,
        status: "in_progress",
        blockers: activeTask.blockedBy,
        verification: activeTask.verification,
        completedVerification: activeTask.completedVerification,
      });
    }

    const runtimePlan = await buildChatPipelineRuntimePlan({
      classification,
      latestUserMessage: latestUserText,
      requestedModelAlias: request.model ?? "",
      userId: auth.userId ?? null,
      userPlan: context.userPlan,
      enabledMcpServers: context.enabledMcpServers,
    });

    emitWorkflowProgress(workflowId, "prompt_build", "running", 25);

    const promptFactory = new PromptFactory();
    let {
      system: enrichedSystemPrompt,
      messages: formattedModelMessages,
      maxTokens: promptMaxTokens,
    } = await promptFactory.assemble(context, {
      classification,
      runtimePlan,
      traceContext: context.traceContext,
    });

    emitWorkflowProgress(workflowId, "prompt_build", "completed", 35);

    // Layer persistent memory and context provenance onto the assembled prompt.
    // Wrapped in try-catch so memory failures never crash prompt assembly.
    try {
      emitWorkflowProgress(workflowId, "memory_enhance", "running", 36);
      const { enhancedSystemPrompt: memoryEnhancedPrompt } =
        await enhanceContext(enrichedSystemPrompt, {
          projectRoot: process.cwd(),
          sessionId: request.sessionId ?? null,
          userId: auth.userId ?? null,
          currentDate: new Date().toISOString(),
        });
      enrichedSystemPrompt = memoryEnhancedPrompt;
      emitWorkflowProgress(workflowId, "memory_enhance", "completed", 38);
    } catch (memoryError) {
      logger.warn(
        `[unifiedChatRuntime] Memory enhancement failed, using original prompt: ${
          memoryError instanceof Error
            ? memoryError.message
            : String(memoryError)
        }`,
      );
      emitWorkflowProgress(workflowId, "memory_enhance", "completed", 38);
    }

    // ── Context Pipeline: cache boundary + provenance tracking ────────────
    // Runs after PromptFactory + memory enhancement to add cache-aware
    // structure and provenance metadata to the assembled prompt.
    try {
      const { PromptAssembler } = await import(
        "@/modules/chat/context-pipeline"
      );
      const assembler = new PromptAssembler();

      // Add the enriched system prompt as a single global section
      assembler.addSection({
        id: "system-prompt",
        content: enrichedSystemPrompt,
        scope: "global",
        source: "prompt-factory",
        priority: 0,
      });

      // Assemble with cache boundary
      const assembled = assembler.assemble();

      // Use the assembled prompt (joined parts with cache boundary markers)
      enrichedSystemPrompt = assembled.systemPromptParts.join("\n\n");

      // Log provenance for debugging
      logger.debug("[unifiedChatRuntime] Context pipeline assembled", {
        staticLength: assembled.staticSection.length,
        dynamicLength: assembled.dynamicSection.length,
        sectionCount:
          assembled.staticSectionIds.length +
          assembled.dynamicSectionIds.length,
        cacheBreakIndex: assembled.cacheBreakIndex,
      });
    } catch (pipelineError) {
      // Non-fatal: fall back to the existing enrichedSystemPrompt
      logger.debug("[unifiedChatRuntime] Context pipeline skipped", {
        error:
          pipelineError instanceof Error
            ? pipelineError.message
            : String(pipelineError),
      });
    }

    if (runtimePlan.isNexCodeModel) {
      enrichedSystemPrompt = `${enrichedSystemPrompt}\n\n${buildMorphSystemDirective()}`;
    }

    const promptMaxOutputTokens = resolvePromptMaxOutputTokens({
      promptMaxTokens,
      hasLoadedTools:
        runtimePlan.toolIdsToLoad.length > 0 ||
        (runtimePlan.expectedMcpToolIds?.length ?? 0) > 0,
    });

    const reservedPromptTokens = Math.ceil(enrichedSystemPrompt.length / 4);
    const tokenBudget = resolveChatRuntimeTokenBudget({
      requestedModel: request.model,
      resolvedModel,
      userPlan: context.userPlan,
      contextLimit,
      reservedTokens: reservedPromptTokens,
      explicitMaxOutputTokens: promptMaxOutputTokens,
      isBuilderTurn:
        runtimePlan.isNexCodeModel || runtimePlan.enableArtifactParity,
    });

    // Microcompact: trim old tool results and images before full compaction
    const microcompactSessionId =
      request.sessionId ?? submissionId ?? "unknown";
    try {
      if (
        shouldAutoCompact(microcompactSessionId, formattedModelMessages, {
          contextWindow: contextLimit,
        })
      ) {
        markCompactionInProgress(microcompactSessionId);
        const { messages: microcompacted, trimmedCount } =
          microcompact(formattedModelMessages);
        formattedModelMessages = microcompacted;
        recordCompactionResult(microcompactSessionId, true);
        if (trimmedCount > 0) {
          logger.debug(
            `[unifiedChatRuntime] Microcompacted ${trimmedCount} items`,
          );
        }
      }
    } catch (microcompactError) {
      recordCompactionResult(microcompactSessionId, false);
      logger.warn(
        `[unifiedChatRuntime] Microcompaction failed, continuing with original messages: ${
          microcompactError instanceof Error
            ? microcompactError.message
            : String(microcompactError)
        }`,
      );
    }

    const compaction = await compactMessages(
      formattedModelMessages as Array<{ role: string; content: UntypedJson }>,
      tokenBudget.compactionContextLimit,
      {
        sessionId: request.sessionId ?? submissionId ?? null,
        reservedTokens: reservedPromptTokens,
        headroomTokens: tokenBudget.outputHeadroomTokens,
      },
    );
    formattedModelMessages = compaction.messages as typeof formattedModelMessages;

    emitWorkflowProgress(workflowId, "tool_setup", "running", 45);

    const toolBudget = resolveUnifiedRuntimeToolBudget({
      requestModel: request.model,
      resolvedModel,
      runtimePlan,
      userPlan: context.userPlan,
    });
    context.contextEnvelope.budget = {
      ...context.contextEnvelope.budget,
      toolMaxInvocations: toolBudget.maxInvocations,
      toolMaxConcurrent: toolBudget.maxConcurrent,
    };
    const toolController = new ToolController({
      emitEvent,
      traceContext: context.traceContext ?? undefined,
      sandboxID: context.sandboxId ?? undefined,
      maxInvocations: toolBudget.maxInvocations,
      maxConcurrent: toolBudget.maxConcurrent,
      userId: auth.userId ?? undefined,
      sessionId: request.sessionId ?? submissionId ?? undefined,
    });

    const [toolset, mcpTools] = await Promise.all([
      loadToolsByIds(runtimePlan.toolIdsToLoad),
      // Preserve read-only fallback for older runtime plans or tests that do not
      // set MCP execution mode explicitly.
      runtimePlan.shouldLoadMcpTools &&
      runtimePlan.expectedMcpToolIds.length > 0
        ? loadAiSdkMcpTools({
            purpose: runtimePlan.mcpPurpose ?? "chat_readonly",
            allowValueMoving: runtimePlan.allowValueMovingMcpTools ?? false,
            userId: auth.userId ?? undefined,
          }).catch((error) => {
            logger.warn(
              `[unifiedChatRuntime] MCP tools unavailable: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return { tools: {}, loaded: [], close: async () => {} };
          })
        : Promise.resolve({ tools: {}, loaded: [], close: async () => {} }),
    ]);

    mcpClose = mcpTools.close;

    // Initialize Nex MCP registry for middleware-managed servers
    // This runs after the AI SDK MCP tool loading above and is supplementary
    try {
      const { initializeRegistry } = await import("../middleware/mcp");
      await initializeRegistry();
    } catch (e) {
      logger.debug("[unifiedChatRuntime] MCP registry init skipped", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    registerAppChatToolContractIds(runtimePlan.promptScopedToolIds);

    const combinedToolset = { ...toolset, ...mcpTools.tools };
    const validatedToolset = preValidateToolsForStream(
      combinedToolset,
      resolvedModel,
      emitEvent,
    );
    const runtimeTools = toolController.wrapToolset(validatedToolset);
    const sanitizedTools = sanitizeToolsForStream(runtimeTools, emitEvent);
    const safeTools = filterUnsafeTools(sanitizedTools, emitEvent);
    const cachedTools = applyToolCachePolicy({
      tools: safeTools,
      userId: auth.userId ?? null,
      sessionId: request.sessionId ?? submissionId ?? null,
      modelId: resolvedModel,
      emitEvent,
    });

    const agentRole: AgentRole = "general";
    const constrainedTools = applyCommandRestrictions(
      cachedTools as Record<string, Tool>,
      agentRole,
    );
    registerAppChatToolContractTools(constrainedTools);

    emitWorkflowProgress(workflowId, "tool_setup", "completed", 55);

    const {
      canUseDirectOpenAi,
      providerModelId,
      originalProviderModelId,
    } = resolveChatProviderModel({
      resolvedModel,
      hasDirectOpenAI: hasDirectOpenAICompatibleProvider,
    });
    const modelProvider = canUseDirectOpenAi
      ? directOpenAIProvider
      : aiGateway;

    if (!canUseDirectOpenAi && !gatewayApiKey) {
      throw new Error(
        "No AI Gateway API key configured. Set AI_GATEWAY_API_KEY.",
      );
    }

    if (canUseDirectOpenAi && providerModelId !== originalProviderModelId) {
      logger.warn(
        `[unifiedChatRuntime] Direct OpenAI does not support ${originalProviderModelId}; falling back to ${providerModelId}.`,
      );
    }

    // Disable OpenAI Responses item storage for /app chat.
    // We have seen multi-step local-tool turns fail in production during stored-item
    // continuation, while resending the full step context remains stable.
    //
    // Also do not request provider reasoning output for the /app chat route.
    // The product already surfaces execution state outside the assistant transcript,
    // and streamed reasoning parts have proven unstable in this multi-step UI flow.
    const providerOptions = {
      openai: {
        store: false,
      },
    };

    return {
      model: modelProvider(providerModelId),
      instructions: enrichedSystemPrompt,
      messages: formattedModelMessages,
      tools: constrainedTools,
      stopWhen: stepCountIs(10),
      ...(tokenBudget.maxOutputTokens
        ? { maxOutputTokens: tokenBudget.maxOutputTokens }
        : {}),
      ...(providerOptions ? { providerOptions } : {}),
      experimental_context: {
        activeToolIds: Object.keys(constrainedTools),
        envelope: context.contextEnvelope ?? null,
        agentRole,
        mcpClose,
        onAgentFinish: options.onAgentFinish ?? null,
      } satisfies UnifiedChatExperimentalContext,
    };
  } catch (error) {
    if (mcpClose) {
      await mcpClose().catch((closeError) => {
        logger.warn(
          "[unifiedChatRuntime] failed to close MCP tools after runtime build error",
          closeError,
        );
      });
    }
    throw error;
  }
}
