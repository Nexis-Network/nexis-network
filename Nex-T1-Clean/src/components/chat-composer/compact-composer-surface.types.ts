"use client";

import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";

import type { ChatComposerProps, ChatComposerStyle, ComposerModelOption } from "@/components/chat-composer/types";
import type { ComposerVoiceRendererProps } from "@/components/chat-composer/voice-renderer-props";
import type {
  AutomationState,
  AutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";

export type CompactComposerSurfaceProps = {
  attachments: NonNullable<ChatComposerProps["draftState"]>["attachments"];
  automationState: AutomationState;
  className?: string;
  composerMaxWidthClass: string;
  composerStyle: ChatComposerStyle;
  composerWidthClass: string;
  contextUsage?: ChatComposerProps["contextUsage"];
  executionPreferences: ChatExecutionPreferences;
  hasInput: boolean;
  inputValue: string;
  intentInsights: ReturnType<
    typeof import("./hooks/use-intent-insights").useIntentInsights
  >;
  isAuthenticated: boolean;
  isBusy: boolean;
  isExpanded: boolean;
  isSending: boolean;
  onAttachmentClick: () => void;
  onAutomationToggle: (key: AutonomousActionKey, value: boolean) => void;
  onComposerStyleChange?: (value: ChatComposerStyle) => void;
  onExecutionPreferencesChange: (value: ChatExecutionPreferences) => void;
  onFormSubmit: (event?: FormEvent) => void;
  onModelSelect: (value: string) => void;
  onPromptClick: (prompt: string) => void;
  onRemoveAttachment: (id: string) => void;
  onTextareaChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaKeyUp: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  options: ComposerModelOption[];
  selectedModel: ComposerModelOption;
  setInputRef: (element: HTMLTextAreaElement | null) => void;
  showIntentInsights: boolean;
  showStarsOverlay: boolean;
  status: ChatComposerProps["status"];
  voiceUi?: ComposerVoiceRendererProps;
};
