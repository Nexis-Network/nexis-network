import type { ChangeEvent, RefObject } from "react";
import type { ChatStatus, FileUIPart, LanguageModelUsage } from "ai";
import type { ModelId } from "tokenlens";
import type { AgentStrategy } from "@/components/dashboard/chat-config";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { ModelWarning } from "@/modules/chat/model-warnings";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import type { RequestTierDecision } from "@/modules/chat/request-tier";
import type { IntentInsightsResult } from "@/components/chat-composer/hooks/use-intent-insights";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import type { AttachmentItem } from "@/components/chat-composer/use-attachments";
import type { CommandInventoryKind } from "@/components/chat-composer/command-inventory";

export type PromptIntentMetadata = {
  normalizedText: string;
  analysis?: MarketIntentAnalysis | null;
  routingDecision?: RequestTierDecision | null;
  recommendedTools?: string[];
  derivedAt: number;
};

export type PromptInputMessage = {
  text?: string;
  files?: FileUIPart[];
  automation?: Record<string, boolean>;
  intentMetadata?: PromptIntentMetadata;
  marketContext?: string;
  executionPreferences?: ChatExecutionPreferences;
};

export type ComposerModelOption = {
  value: string;
  name: string;
  description?: string;
  strategy?: AgentStrategy;
  max?: boolean;
  /**
   * Optional badges used for UI decoration (e.g. "DEGEN").
   * Kept lightweight so the model selector can render without importing dashboard chat config types.
   */
  badges?: string[];
  warning?: ModelWarning;
};

export type ComposerContextUsage = {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: ModelId;
};

export type ChatComposerStyle = "default" | "small";

export type ComposerPendingModelWarning = {
  value: string;
  warning: NonNullable<ComposerModelOption["warning"]>;
};

export type ComposerDraftState = {
  attachments: AttachmentItem[];
  handleAttachmentSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  triggerAttachmentPicker: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  commandQuery: string;
  setCommandQuery: (value: string) => void;
  tokenSearchOpen: boolean;
  setTokenSearchOpen: (open: boolean) => void;
  tokenSearchQuery: string;
  setTokenSearchQuery: (value: string) => void;
  tokenSearchInsertionIndex: number | null;
  setTokenSearchInsertionIndex: (index: number | null) => void;
  authDialogOpen: boolean;
  setAuthDialogOpen: (open: boolean) => void;
  pendingModelWarning: ComposerPendingModelWarning | null;
  setPendingModelWarning: (
    warning: ComposerPendingModelWarning | null,
  ) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
};

export type ChatComposerProps = {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onAutomationChange?: (state: Record<string, boolean>) => void;
  selectedModel?: ComposerModelOption;
  onModelChange?: (value: string, strategy?: AgentStrategy) => void;
  onPromptSelect?: (prompt: string) => void;
  isBusy?: boolean;
  hideIntentInsightsPanel?: boolean;
  hidePromptShortcuts?: boolean;
  onIntentInsightsChange?: (insights: IntentInsightsResult) => void;
  contextUsage?: ComposerContextUsage;
  className?: string;
  showStarsOverlay?: boolean;
  composerStyle?: ChatComposerStyle;
  onComposerStyleChange?: (value: ChatComposerStyle) => void;
  executionPreferences?: ChatExecutionPreferences;
  onExecutionPreferencesChange?: (value: ChatExecutionPreferences) => void;
  draftState?: ComposerDraftState;
  messages?: ConversationMessage[];
};

export type CommandPaletteItem = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  kind?: CommandInventoryKind;
  category?: string;
  keywords?: string[];
  perform: () => void;
};
