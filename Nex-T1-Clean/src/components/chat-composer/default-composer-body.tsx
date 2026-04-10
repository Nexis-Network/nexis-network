"use client";

import { AttachmentsList } from "@/components/chat-composer/attachments-list";
import { ComposerFooterControls } from "@/components/chat-composer/composer-footer-controls";
import { ComposerInputArea } from "@/components/chat-composer/composer-input-area";
import {
  COMPOSER_INNER_SURFACE_CLASS,
} from "@/components/chat-composer/composer-theme";
import { DefaultComposerPlaceholder } from "@/components/chat-composer/default-composer-placeholder";
import { IntentInsightsPanel } from "@/components/chat-composer/intent-insights-panel";
import { SendButton } from "@/components/chat-composer/send-button";
import { cn } from "@/lib/utils";

import type { DefaultComposerSurfaceProps } from "./default-composer-surface.types";

type DefaultComposerBodyProps = Pick<
  DefaultComposerSurfaceProps,
  | "attachments"
  | "automationDisabled"
  | "automationState"
  | "composerInnerGapClass"
  | "composerInnerMinHeightClass"
  | "composerInnerPaddingClass"
  | "composerInputMinHeightClass"
  | "composerStyle"
  | "composerVoicePanelMinHeightClass"
  | "contextUsage"
  | "disabled"
  | "executionPreferences"
  | "hasAttachments"
  | "hasInput"
  | "hideIntentInsightsPanel"
  | "inputRef"
  | "inputValue"
  | "intentInsights"
  | "isAuthenticated"
  | "isCommandOpen"
  | "minimalControls"
  | "isTokenSearchOpen"
  | "messages"
  | "onAttachmentClick"
  | "onAutomationToggle"
  | "onChange"
  | "onCommandClose"
  | "onComposerStyleChange"
  | "onExecutionPreferencesChange"
  | "onModelSelect"
  | "onPromptClick"
  | "onRemoveAttachment"
  | "onSend"
  | "onSlashCommand"
  | "onTokenSearch"
  | "onTokenSearchClose"
  | "options"
  | "selectedModel"
  | "showIntentInsights"
  | "status"
  | "useNexInstantSurface"
  | "voiceUi"
>;

export function DefaultComposerBody({
  attachments,
  automationDisabled,
  automationState,
  composerInnerGapClass,
  composerInnerMinHeightClass,
  composerInnerPaddingClass,
  composerInputMinHeightClass,
  composerStyle,
  composerVoicePanelMinHeightClass,
  contextUsage,
  disabled,
  executionPreferences,
  hasAttachments,
  hasInput,
  hideIntentInsightsPanel,
  inputRef,
  inputValue,
  intentInsights,
  isAuthenticated,
  isCommandOpen,
  minimalControls,
  isTokenSearchOpen,
  onAttachmentClick,
  onAutomationToggle,
  onChange,
  onCommandClose,
  onComposerStyleChange,
  onExecutionPreferencesChange,
  onModelSelect,
  onPromptClick,
  onRemoveAttachment,
  onSend,
  onSlashCommand,
  onTokenSearch,
  onTokenSearchClose,
  options,
  selectedModel,
  showIntentInsights,
  status,
  useNexInstantSurface,
  voiceUi,
}: DefaultComposerBodyProps) {
  const isVoicePanelActive = Boolean(voiceUi?.isPanelOpen && voiceUi.panel);

  return (
    <div
      className={cn(
        COMPOSER_INNER_SURFACE_CLASS,
        composerInnerMinHeightClass,
        composerInnerPaddingClass,
        composerInnerGapClass,
      )}
    >
      <div className={cn("relative w-full", composerInputMinHeightClass)}>
        {isVoicePanelActive && voiceUi?.panel ? (
          <div className={composerVoicePanelMinHeightClass}>{voiceUi.panel}</div>
        ) : (
          <ComposerInputArea
            ariaLabel="Message prompt"
            ref={inputRef}
            value={inputValue}
            onChange={onChange}
            onSubmit={onSend}
            isCommandOpen={isCommandOpen}
            onCommandClose={onCommandClose}
            onSlashCommand={onSlashCommand}
            isTokenSearchOpen={isTokenSearchOpen}
            onTokenSearchClose={onTokenSearchClose}
            onTokenSearch={onTokenSearch}
            placeholderSlot={
              <DefaultComposerPlaceholder
                useNexInstantSurface={useNexInstantSurface}
              />
            }
            disabled={disabled}
            className="pl-[var(--auth-composer-input-padding-leading)]"
          />
        )}
      </div>

      <div className="w-full pb-[2px]">
        <ComposerFooterControls
          modelValue={selectedModel.value}
          options={options}
          onModelSelect={onModelSelect}
          automationState={automationState}
          automationDisabled={automationDisabled}
          onAutomationToggle={onAutomationToggle}
          isAuthenticated={isAuthenticated}
          onAttachmentClick={onAttachmentClick}
          hasAttachments={hasAttachments}
          hasInput={hasInput}
          executionPreferences={executionPreferences}
          onExecutionPreferencesChange={onExecutionPreferencesChange}
          composerStyle={composerStyle}
          onComposerStyleChange={onComposerStyleChange ?? (() => undefined)}
          voiceBadge={voiceUi?.badge}
          muteButton={voiceUi?.muteButton}
          toggleButton={voiceUi?.toggleButton}
          contextUsage={contextUsage}
          minimalControls={minimalControls}
          variant={useNexInstantSurface ? "nexInstant" : "default"}
          sendButton={
            <SendButton
              status={status}
              disabled={!hasInput || disabled}
              onClick={onSend}
            />
          }
        />
      </div>

      {showIntentInsights && !hideIntentInsightsPanel ? (
        <div className="w-full px-1">
          <IntentInsightsPanel
            insights={intentInsights}
            onHintSelect={onPromptClick}
          />
        </div>
      ) : null}

      <div className="w-full px-1">
        <AttachmentsList attachments={attachments} onRemove={onRemoveAttachment} />
      </div>
    </div>
  );
}
