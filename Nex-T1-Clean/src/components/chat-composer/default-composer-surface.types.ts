"use client";

import type { RefObject } from "react";

import type { ChatComposerProps, ChatComposerStyle, ComposerModelOption } from "@/components/chat-composer/types";
import type { ComposerVoiceRendererProps } from "@/components/chat-composer/voice-renderer-props";
import type {
  AutomationState,
  AutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";

export type DefaultComposerSurfaceProps = {
  attachments: NonNullable<ChatComposerProps["draftState"]>["attachments"];
  automationDisabled: boolean;
  automationState: AutomationState;
  className?: string;
  composerCardMinHeightClass: string;
  composerCardRadiusClass: string;
  composerInnerGapClass: string;
  composerInnerMinHeightClass: string;
  composerInnerPaddingClass: string;
  composerInnerRadiusClass: string;
  composerInputMinHeightClass: string;
  composerStyle: ChatComposerStyle;
  composerVoicePanelMinHeightClass: string;
  composerWidthClass: string;
  contextUsage?: ChatComposerProps["contextUsage"];
  disabled: boolean;
  executionPreferences: ChatExecutionPreferences;
  hasAttachments: boolean;
  hasInput: boolean;
  hideIntentInsightsPanel: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  inputValue: string;
  intentInsights: ReturnType<
    typeof import("./hooks/use-intent-insights").useIntentInsights
  >;
  isAuthenticated: boolean;
  isCommandOpen: boolean;
  isComposerGradientActive: boolean;
  minimalControls: boolean;
  isTokenSearchOpen: boolean;
  messages: NonNullable<ChatComposerProps["messages"]>;
  onAttachmentClick: () => void;
  onAutomationToggle: (key: AutonomousActionKey, value: boolean) => void;
  onChange: (value: string) => void;
  onCommandClose: () => void;
  onComposerStyleChange?: (value: ChatComposerStyle) => void;
  onExecutionPreferencesChange: (value: ChatExecutionPreferences) => void;
  onModelSelect: (value: string) => void;
  onPromptClick: (prompt: string) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  onSlashCommand: () => void;
  onTokenSearch: (index: number) => void;
  onTokenSearchClose: () => void;
  options: ComposerModelOption[];
  selectedModel: ComposerModelOption;
  showIntentInsights: boolean;
  showStarsOverlay: boolean;
  status: ChatComposerProps["status"];
  useNexInstantSurface: boolean;
  voiceUi?: ComposerVoiceRendererProps;
};
