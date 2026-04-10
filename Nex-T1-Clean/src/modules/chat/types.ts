import { z } from "zod";
import { CLASSIFICATION_ROUTES } from "@/lib/routing-classification";
import { PROMPT_MODULE_IDS } from "@/modules/ai/system-prompt/module-ids";
import type { AIAgent, AIAgentStream } from "@/lib/schema";
import { AIAgentStreamSchema, SourceSchema } from "@/lib/schema";
import { ChatExecutionPreferencesSchema } from "@/modules/chat/execution-preferences";
import type {
  ContextEnvelope,
  ContextEnvelopeArtifactRef,
} from "@/modules/chat/context-envelope";
import type { ServerCachePolicy } from "@/modules/chat/pipeline/cache-policy";
import type { StructuredCompactionState } from "@/modules/chat/state/compaction-store";

export type { AIAgentStream };

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    z.string().min(1, "Message content cannot be empty"),
    z.array(z.any()),
  ]),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const PromptModuleSchema = z.enum(PROMPT_MODULE_IDS);

export const ArtifactHintSchema = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
});

const LatencyPreferenceSchema = z.enum(["default", "low"]);

export const ChatAgentRequestSchema = z.object({
  model: z.string().optional(),
  messages: z
    .array(ChatMessageSchema)
    .min(1, "At least one message is required"),
  submissionId: z.string().optional(),
  sessionId: z.string().optional(),
  systemPromptProfileId: z.string().optional(),
  marketContext: z.string().optional(),
  automationPreferences: z.record(z.string(), z.boolean()).optional(),
  executionPreferences: ChatExecutionPreferencesSchema.optional(),
  attachmentSummary: z.string().optional(),
  attachmentContext: z.string().optional(),
  attachmentPromptContexts: z.array(z.string()).optional(),
  attachmentContextTruncated: z.boolean().optional(),
  attachmentCount: z.number().int().nonnegative().optional(),
  tierRoute: z.enum(CLASSIFICATION_ROUTES).optional(),
  promptModules: z.array(PromptModuleSchema).optional(),
  artifactHints: z.array(ArtifactHintSchema).optional(),
  pageContext: z
    .object({
      title: z.string().optional(),
      url: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
  clientTimeContext: z
    .object({
      timeZone: z.string(),
      timestamp: z.string(), // ISO string from the client
      formatted24h: z.string(), // 24-hour formatted string from the client
      locale: z.string().optional(), // Browser locale (e.g. en-US)
    })
    .optional(),
  browsingHistory: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        timestamp: z.number(),
        entities: z.object({
          evmAddresses: z.array(z.string()),
          solanaAddresses: z.array(z.string()),
          tickers: z.array(z.string()),
        }),
      }),
    )
    .optional(),
  agentId: z.string().uuid().optional(),
  latencyPreference: LatencyPreferenceSchema.optional(),
  walletContext: z
    .object({
      evm: z
        .object({
          address: z.string(),
          chainId: z.number(),
        })
        .optional()
        .nullable(),
      solana: z
        .object({
          address: z.string(),
        })
        .optional()
        .nullable(),
      selected: z
        .object({
          id: z.string().min(1),
          kind: z.enum([
            "eoa",
            "cdp_evm_smart",
            "cdp_solana_embedded",
            "agentkit",
          ]),
          platform: z.enum(["evm", "solana"]),
          address: z.string().min(1),
          label: z.string().optional(),
          chainId: z.number().nullable().optional(),
          source: z.enum(["chat_composer"]).optional(),
          agentId: z.string().nullable().optional(),
          agentName: z.string().nullable().optional(),
        })
        .optional()
        .nullable(),
    })
    .optional(),
});

export type ChatAgentRequest = z.infer<typeof ChatAgentRequestSchema>;

export type ArtifactHint = z.infer<typeof ArtifactHintSchema>;
export type LatencyPreference = z.infer<typeof LatencyPreferenceSchema>;

export const ThoughtSchema = AIAgentStreamSchema.pick({
  thought: true,
  ideaFragment: true,
});

export const ToolInvocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["queued", "executing", "complete", "error"]),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  summary: z.string().optional(),
  error: z.string().optional(),
  artifactId: z.string().optional(),
});

export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;

export type StructuredChatPayload = {
  message: string;
  reasoning: z.infer<typeof ThoughtSchema>[];
  agent: AIAgent | null;
  sources: z.infer<typeof SourceSchema>[];
  toolCalls: ToolInvocation[];
  cacheable: boolean;
  cachePolicy?: Pick<
    ServerCachePolicy,
    "version" | "readKey" | "writeKey" | "canRead" | "canWrite" | "reasons"
  > | null;
  artifactRefs?: ContextEnvelopeArtifactRef[];
  contextEnvelope?: ContextEnvelope | null;
  compaction?: Pick<StructuredCompactionState, "version" | "updatedAt"> & {
    summary?: string;
  };
};

export type AttachmentContextMeta = {
  count: number;
  promptSegments: number;
  summaryLength: number;
  contextLength: number;
  truncated: boolean;
  previewSample?: string;
};

export type AutomationSummary = {
  enabled: string[];
  disabled: string[];
  directive: string;
};

export type AttachmentFingerprint = {
  sha256?: string | null;
  hasAttachmentTelemetry: boolean;
};

/**
 * All chat requests now execute locally. The langgraph executor has been removed.
 */
export type ExecutorDecision = {
  executor: "local";
  reason: string;
};
