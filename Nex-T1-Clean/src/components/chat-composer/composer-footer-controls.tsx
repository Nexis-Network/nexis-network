"use client";

import { cloneElement, isValidElement, type ReactNode } from "react";

import { ComposerActionMenu } from "@/components/chat-composer/composer-action-menu";
import { ComposerPreferencesMenu } from "@/components/chat-composer/composer-preferences-menu";
import { AudioLines } from "@/components/animate-ui/icons/audio-lines";
import type {
  AutomationState,
  AutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import { cn } from "@/lib/utils";

import type { ChatComposerStyle, ComposerContextUsage } from "./types";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS,
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
} from "@/components/chat-composer/composer-theme";
import type { ComposerModelOption } from "@/components/chat-composer/model-selector";

interface ComposerFooterControlsProps {
  onAttachmentClick: () => void;
  hasAttachments: boolean;
  hasInput: boolean;
  automationState: AutomationState;
  automationDisabled?: boolean;
  onAutomationToggle: (key: AutonomousActionKey, value: boolean) => void;
  isAuthenticated: boolean;
  modelValue: string;
  options: readonly ComposerModelOption[];
  onModelSelect: (value: string) => void;
  executionPreferences: ChatExecutionPreferences;
  onExecutionPreferencesChange: (value: ChatExecutionPreferences) => void;
  composerStyle: ChatComposerStyle;
  onComposerStyleChange: (value: ChatComposerStyle) => void;
  contextUsage?: ComposerContextUsage;
  voiceBadge: ReactNode;
  muteButton: ReactNode;
  toggleButton: ReactNode;
  sendButton: ReactNode;
  variant?: "default" | "nexInstant";
  minimalControls?: boolean;
}

function withClassName(node: ReactNode, className: string) {
  if (!isValidElement<{ className?: string }>(node)) {
    return node;
  }

  return cloneElement(node, {
    className: cn(node.props.className, className),
  });
}

function ContextUsageIndicator({
  contextUsage,
}: {
  contextUsage?: ComposerContextUsage;
}) {
  if (!contextUsage || contextUsage.usedTokens <= 0) {
    return null;
  }

  return (
    <Context
      usedTokens={contextUsage.usedTokens}
      maxTokens={contextUsage.maxTokens}
      usage={contextUsage.usage}
      modelId={contextUsage.modelId}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}

export function ComposerFooterControls({
  onAttachmentClick,
  hasAttachments: _hasAttachments,
  hasInput,
  automationState,
  automationDisabled: _automationDisabled,
  onAutomationToggle,
  isAuthenticated,
  modelValue,
  options,
  onModelSelect,
  executionPreferences,
  onExecutionPreferencesChange,
  composerStyle,
  onComposerStyleChange,
  contextUsage,
  voiceBadge,
  muteButton,
  toggleButton,
  sendButton,
  variant = "default",
  minimalControls = false,
}: ComposerFooterControlsProps) {
  const controlButtonClassName = COMPOSER_EMPHASIZED_ICON_BUTTON_CLASS;
  const sendButtonClassName = COMPOSER_ICON_BUTTON_CLASS;
  const resolvedToggleButton = withClassName(
    toggleButton,
    controlButtonClassName,
  ) || (
    <div className={cn(controlButtonClassName, "opacity-60")}>
      <AudioLines className={COMPOSER_ICON_CLASS} />
    </div>
  );

  if (variant === "nexInstant") {
    const instantToggleButton = withClassName(
      toggleButton,
      controlButtonClassName,
    );
    const instantMuteButton = withClassName(
      muteButton,
      controlButtonClassName,
    );
    const instantSendButton = withClassName(
      sendButton,
      sendButtonClassName,
    );

    return (
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ComposerActionMenu
            onUploadClick={onAttachmentClick}
            automationState={automationState}
            onAutomationToggle={onAutomationToggle}
            isAuthenticated={isAuthenticated}
            className={controlButtonClassName}
            triggerVariant="nexInstant"
            modelValue={modelValue}
            modelOptions={options}
            onModelSelect={onModelSelect}
          />

          <ComposerPreferencesMenu
            executionPreferences={executionPreferences}
            onExecutionPreferencesChange={onExecutionPreferencesChange}
            composerStyle={composerStyle}
            onComposerStyleChange={onComposerStyleChange}
            triggerClassName={controlButtonClassName}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ContextUsageIndicator contextUsage={contextUsage} />
          {voiceBadge}
          {instantMuteButton}
          {instantToggleButton || (
            <div className={cn(controlButtonClassName, "opacity-60")}>
              <AudioLines className={COMPOSER_ICON_CLASS} />
            </div>
          )}
          {hasInput ? instantSendButton : null}
        </div>
      </div>
    );
  }

  if (minimalControls) {
    const sendControl = hasInput
      ? withClassName(sendButton, sendButtonClassName)
      : null;

    return (
      <div className="flex h-[var(--auth-composer-footer-height)] w-full items-end justify-between gap-4 px-[var(--auth-composer-footer-padding-x)]">
        <ComposerActionMenu
          onUploadClick={onAttachmentClick}
          automationState={automationState}
          onAutomationToggle={onAutomationToggle}
          isAuthenticated={isAuthenticated}
          className={controlButtonClassName}
          modelValue={modelValue}
          modelOptions={options}
          onModelSelect={onModelSelect}
        />

        <div className="ml-auto flex items-center gap-[var(--auth-composer-footer-gap)]">
          {hasInput ? sendControl : resolvedToggleButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ComposerActionMenu
              onUploadClick={onAttachmentClick}
              automationState={automationState}
              onAutomationToggle={onAutomationToggle}
              isAuthenticated={isAuthenticated}
              className={controlButtonClassName}
              modelValue={modelValue}
              modelOptions={options}
              onModelSelect={onModelSelect}
            />

            <ComposerPreferencesMenu
              executionPreferences={executionPreferences}
              onExecutionPreferencesChange={onExecutionPreferencesChange}
              composerStyle={composerStyle}
              onComposerStyleChange={onComposerStyleChange}
              triggerClassName={controlButtonClassName}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ContextUsageIndicator contextUsage={contextUsage} />

          {voiceBadge}
          {withClassName(muteButton, controlButtonClassName)}

          {resolvedToggleButton}

          {hasInput ? sendButton : null}
        </div>
      </div>
    </div>
  );
}
