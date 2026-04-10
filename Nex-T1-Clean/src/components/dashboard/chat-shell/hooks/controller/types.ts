import type { ChatMessage } from "@/modules/chat/types";
import type {
  AssistantPayload,
  ConversationMessage,
  DisplayPreferences,
  FollowUpSuggestion,
} from "@/components/dashboard/chat-types";
import type { PromptInputMessage } from "@/components/chat-composer/types";
import type { ChatModel } from "@/components/dashboard/chat-config";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import type { RequestTierDecision } from "@/modules/chat/request-tier";
import type { ArtifactHint, LatencyPreference } from "@/modules/chat/types";
import type { PromptModuleId } from "@/modules/ai/system-prompt/module-ids";

export type SubmissionAttachment = Required<NonNullable<PromptInputMessage["files"]>>[number];

export type SubmissionGuardResult = "noop" | "pong";

export type PreparedSubmission = {
  submissionId: string;
  assistantId: string;
  userMessage: ConversationMessage;
  assistantModel: string;
  history: ChatMessage[];
  requestedTickers: string[];
  displayPreferences: DisplayPreferences;
  intentAnalysis: MarketIntentAnalysis;
  tierDecision: RequestTierDecision;
  followUpSuggestions: FollowUpSuggestion[];
  analysisInput: string;
  requestContent: string;
  displayText: string;
  normalizedPrompt: string;
  shouldRequestMarketData: boolean;
  primaryTicker: string | null;
  attachments: SubmissionAttachment[];
  systemPromptProfileId?: string;
  attachmentSummary?: string;
  attachmentContext?: string;
  attachmentPromptContexts?: string[];
  attachmentContextTruncated?: boolean;
  automationPreferences?: Record<string, boolean>;
  payloads?: AssistantPayload[];
  promptModules?: PromptModuleId[];
  artifactHints?: ArtifactHint[];
  latencyPreference?: LatencyPreference;
};

export type SubmissionResponse =
  | { type: "guard"; reason: SubmissionGuardResult }
  | { type: "auth_required" }
  | { type: "command" }
  | { type: "prepared"; submission: PreparedSubmission };

export type SubmissionPipelineParams = {
  message: PromptInputMessage;
  selectedModel: ChatModel;
  inputValue: string;
  systemPromptProfileId: string;
};

export type MarketStreamResult = {
  marketContext?: Record<string, UntypedJson> | undefined;
  error?: string | null;
};

export type StreamLifecycleHandlers = {
  onStreamStart: (submissionId: string) => void;
  onStreamComplete: (submissionId: string) => void;
  onStreamError: (submissionId: string, error: string | null) => void;
};
