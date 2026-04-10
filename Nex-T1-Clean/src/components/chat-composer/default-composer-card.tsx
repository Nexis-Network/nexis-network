"use client";

import { ComposerBackground } from "@/components/chat-composer/composer-background";
import { DefaultComposerBody } from "@/components/chat-composer/default-composer-body";
import { DefaultComposerFrame } from "@/components/chat-composer/default-composer-frame";
import { UpgradeBanner } from "@/components/chat-composer/upgrade-banner";

import type { DefaultComposerSurfaceProps } from "./default-composer-surface.types";

type DefaultComposerCardProps = Pick<
  DefaultComposerSurfaceProps,
  | "attachments"
  | "automationDisabled"
  | "automationState"
  | "className"
  | "composerCardMinHeightClass"
  | "composerCardRadiusClass"
  | "composerInnerGapClass"
  | "composerInnerMinHeightClass"
  | "composerInnerPaddingClass"
  | "composerInputMinHeightClass"
  | "composerStyle"
  | "composerVoicePanelMinHeightClass"
  | "composerWidthClass"
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
  | "isComposerGradientActive"
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
  | "showStarsOverlay"
  | "status"
  | "useNexInstantSurface"
  | "voiceUi"
>;

export function DefaultComposerCard({
  attachments,
  automationDisabled,
  automationState,
  className,
  composerCardMinHeightClass,
  composerCardRadiusClass,
  composerInnerGapClass,
  composerInnerMinHeightClass,
  composerInnerPaddingClass,
  composerInputMinHeightClass,
  composerStyle,
  composerVoicePanelMinHeightClass,
  composerWidthClass,
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
  isComposerGradientActive,
  minimalControls,
  isTokenSearchOpen,
  messages,
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
  showStarsOverlay,
  status,
  useNexInstantSurface,
  voiceUi,
}: DefaultComposerCardProps) {
  return (
    <DefaultComposerFrame
      className={className}
      composerCardMinHeightClass={composerCardMinHeightClass}
      composerCardRadiusClass={composerCardRadiusClass}
      composerWidthClass={composerWidthClass}
      useNexInstantSurface={useNexInstantSurface}
    >
      <ComposerBackground
        isActive={isComposerGradientActive}
        modelValue={selectedModel.value}
        showStarsOverlay={showStarsOverlay}
      />

      <UpgradeBanner
        isActive={isComposerGradientActive}
        messages={messages}
        modelValue={selectedModel.value}
        status={status}
        variant={useNexInstantSurface ? "instant-muted" : "default"}
        size="default"
      />

      <DefaultComposerBody
        attachments={attachments}
        automationDisabled={automationDisabled}
        automationState={automationState}
        composerInnerGapClass={composerInnerGapClass}
        composerInnerMinHeightClass={composerInnerMinHeightClass}
        composerInnerPaddingClass={composerInnerPaddingClass}
        composerInputMinHeightClass={composerInputMinHeightClass}
        composerStyle={composerStyle}
        composerVoicePanelMinHeightClass={composerVoicePanelMinHeightClass}
        contextUsage={contextUsage}
        disabled={disabled}
        executionPreferences={executionPreferences}
        hasAttachments={hasAttachments}
        hasInput={hasInput}
        hideIntentInsightsPanel={hideIntentInsightsPanel}
        inputRef={inputRef}
        inputValue={inputValue}
        intentInsights={intentInsights}
        isAuthenticated={isAuthenticated}
        isCommandOpen={isCommandOpen}
        minimalControls={minimalControls}
        isTokenSearchOpen={isTokenSearchOpen}
        messages={messages}
        onAttachmentClick={onAttachmentClick}
        onAutomationToggle={onAutomationToggle}
        onChange={onChange}
        onCommandClose={onCommandClose}
        onComposerStyleChange={onComposerStyleChange}
        onExecutionPreferencesChange={onExecutionPreferencesChange}
        onModelSelect={onModelSelect}
        onPromptClick={onPromptClick}
        onRemoveAttachment={onRemoveAttachment}
        onSend={onSend}
        onSlashCommand={onSlashCommand}
        onTokenSearch={onTokenSearch}
        onTokenSearchClose={onTokenSearchClose}
        options={options}
        selectedModel={selectedModel}
        showIntentInsights={showIntentInsights}
        status={status}
        useNexInstantSurface={useNexInstantSurface}
        voiceUi={voiceUi}
      />
    </DefaultComposerFrame>
  );
}
