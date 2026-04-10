import {
  defaultSettingsMiddleware,
  ToolLoopAgent,
  stepCountIs,
  wrapLanguageModel,
  type Tool,
} from "ai";
import { z } from "zod";

import {
  buildUnifiedChatRuntime,
  type UnifiedChatExperimentalContext,
  type UnifiedChatRuntimeEventEmitter,
  type UnifiedChatFinishEvent,
} from "@/modules/chat/runtime/unified-chat-runtime";
import { appChatToolContract } from "@/modules/chat/app-chat-tool-contract";
import { computeStepGate } from "@/modules/chat/workflow/step-gate";
import { isWorkflowGatesEnabled } from "@/modules/chat/workflow/workflow-rules";
import { filterToolIdsForRole, getFirstToolRestriction, isRoleScopingEnabled, type AgentRole } from "@/modules/chat/agent-roles";
import { ChatAgentRequestSchema, type ChatAgentRequest } from "@/modules/chat/types";
import {
  directOpenai as directOpenAIProvider,
  directOpenaiConfig,
  hasUsableOpenAIApiKey,
  openai as openaiCompatibleProvider,
} from "@/server/services/ai-sdk/openai";

export { sanitizeUiMessagesForNativeChatRoute } from "@/modules/chat/controller/ui-message-sanitizer";

export type AppChatAgentOptions = {
  request: ChatAgentRequest;
  auth: {
    userId?: string | null;
    accessToken?: string | null;
  };
  emitEvent?: UnifiedChatRuntimeEventEmitter | null;
  onAgentFinish?: ((event: UnifiedChatFinishEvent) => Promise<void> | void) | null;
};

const EmitEventSchema = z.custom<UnifiedChatRuntimeEventEmitter | null | undefined>(
  (value) => value == null || typeof value === "function",
);

const OnAgentFinishSchema = z.custom<AppChatAgentOptions["onAgentFinish"]>(
  (value) => value == null || typeof value === "function",
);

export const AppChatAgentOptionsSchema = z.object({
  request: ChatAgentRequestSchema,
  auth: z.object({
    userId: z.string().nullable().optional(),
    accessToken: z.string().nullable().optional(),
  }),
  emitEvent: EmitEventSchema.optional(),
  onAgentFinish: OnAgentFinishSchema.optional(),
}) as unknown as z.ZodType<AppChatAgentOptions>;

/**
 * Placeholder model for the ToolLoopAgent constructor.
 *
 * This is NEVER used at runtime — `prepareCall` (via `buildUnifiedChatRuntime`)
 * resolves the real model from the user's tier, intent classification, and
 * provider configuration. The SDK requires a model at construction time for
 * type inference, so we supply a cheap default wrapped with our standard
 * provider options.
 */
function createAgentPlaceholderModel() {
  const provider = hasUsableOpenAIApiKey(directOpenaiConfig.apiKey)
    ? directOpenAIProvider
    : openaiCompatibleProvider;

  return wrapLanguageModel({
    model: provider("gpt-4o-mini"),
    middleware: defaultSettingsMiddleware({
      settings: {
        providerOptions: {
          openai: {
            store: false,
          },
        },
      },
    }),
  });
}

function getActiveToolIds(
  context: UnifiedChatExperimentalContext | undefined,
): string[] | undefined {
  const activeToolIds = context?.activeToolIds;
  if (!Array.isArray(activeToolIds) || activeToolIds.length === 0) {
    return undefined;
  }

  const normalizedToolIds = activeToolIds
    .filter((toolId): toolId is string => typeof toolId === "string")
    .map((toolId) => toolId.trim())
    .filter(Boolean);

  return normalizedToolIds.length > 0 ? normalizedToolIds : undefined;
}

export const appChatAgent = new ToolLoopAgent<
  AppChatAgentOptions,
  Record<string, Tool>
>({
  id: "app-chat-agent",
  model: createAgentPlaceholderModel(),
  tools: appChatToolContract,
  stopWhen: stepCountIs(10),
  callOptionsSchema: AppChatAgentOptionsSchema,
  prepareStep: ({ experimental_context, stepNumber }) => {
    const context =
      experimental_context as UnifiedChatExperimentalContext | undefined;
    let activeToolIds = getActiveToolIds(context);

    if (
      isWorkflowGatesEnabled() &&
      context?.envelope &&
      activeToolIds
    ) {
      const gateResult = computeStepGate(
        context.envelope,
        activeToolIds,
        stepNumber,
      );
      if (gateResult.activeTools) {
        const gateSet = new Set(gateResult.activeTools);
        activeToolIds = activeToolIds.filter((id) => gateSet.has(id));
      }
    }

    // Role-based tool filtering
    if (isRoleScopingEnabled() && context?.agentRole && activeToolIds) {
      const role = context.agentRole as AgentRole;
      activeToolIds = filterToolIdsForRole(activeToolIds, role);

      // First-tool sequencing
      const firstToolRestriction = getFirstToolRestriction(role, stepNumber);
      if (firstToolRestriction) {
        activeToolIds = activeToolIds.filter((id) => firstToolRestriction.includes(id));
      }
    }

    return activeToolIds ? { activeTools: activeToolIds } : undefined;
  },
  prepareCall: async ({ options }) => buildUnifiedChatRuntime(options),
  onFinish: async (event) => {
    const context =
      event.experimental_context as UnifiedChatExperimentalContext | undefined;

    try {
      await context?.onAgentFinish?.({
        totalUsage: event.totalUsage,
        toolCalls: event.toolCalls,
        steps: event.steps,
      });
    } finally {
      await context?.mcpClose?.();
    }
  },
});

export type AppChatUIMessage = import("ai").InferAgentUIMessage<
  typeof appChatAgent
>;
