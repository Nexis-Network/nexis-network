"use client";

import { useCallback, useRef } from "react";

import { ComposerRuntimeShell } from "@/components/chat-composer/composer-runtime-shell";
import { resolveDefaultComposerLayout } from "@/components/chat-composer/default-composer-layout";
import { DefaultComposerSurface } from "@/components/chat-composer/default-composer-surface";
import { MODELS } from "@/components/chat-composer/constants";
import { COMPOSER_FONT_CLASS } from "@/components/chat-composer/composer-theme";
import { insertTextAtCursor } from "@/components/chat-composer/utils/trigger-detection";
import { useComposerCommandState } from "@/components/chat-composer/hooks/use-composer-command-state";
import { useComposerSubmitState } from "@/components/chat-composer/hooks/use-composer-submit-state";
import { useComposerUiState } from "@/components/chat-composer/hooks/use-composer-ui-state";
import type { ChatComposerProps } from "@/components/chat-composer/types";
import type { ComposerVoiceRendererProps } from "@/components/chat-composer/voice-renderer-props";
import { cn } from "@/lib/utils";

export { attachmentsToFileUIParts } from "./utils/attachments";

export function ChatComposer({
  inputValue,
  onInputChange,
  onSubmit,
  status,
  selectedModel = MODELS[0],
  onModelChange,
  onPromptSelect,
  onAutomationChange,
  isBusy = false,
  hideIntentInsightsPanel = true,
  hidePromptShortcuts = false,
  onIntentInsightsChange,
  contextUsage,
  className,
  messages = [],
  showStarsOverlay = false,
  composerStyle = "default",
  onComposerStyleChange,
  executionPreferences,
  onExecutionPreferencesChange,
  draftState,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const tokenSearchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    automationLoading,
    automationPreferences,
    automationSaving,
    automationStateRef,
    handleAuthNavigation,
    handleAutomationToggle,
    handleExecutionPreferencesChange,
    handleModelSelect,
    handleModelWarningCancel,
    handleModelWarningConfirm,
    isAuthenticated,
    resolvedDraftState,
    resolvedExecutionPreferences,
  } = useComposerUiState({
    draftState,
    executionPreferences,
    onAutomationChange,
    onExecutionPreferencesChange,
    onModelChange,
  });

  const handlePromptClick = useCallback(
    (prompt: string) => {
      if (inputRef.current) {
        inputRef.current.value = prompt;
        onInputChange(prompt);
        inputRef.current.focus();
      }
      onPromptSelect?.(prompt);
    },
    [onInputChange, onPromptSelect],
  );

  const applyComposerInsertion = useCallback(
    (text: string, insertionIndex?: number | null) => {
      const currentValue = inputValue ?? "";
      const selectionStart =
        insertionIndex ?? inputRef.current?.selectionStart ?? currentValue.length;
      const selectionEnd =
        insertionIndex ?? inputRef.current?.selectionEnd ?? selectionStart;
      const nextState = insertTextAtCursor(
        currentValue,
        selectionStart,
        selectionEnd,
        text,
      );

      onInputChange(nextState.value);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          nextState.selectionStart,
          nextState.selectionStart,
        );
      });
    },
    [inputValue, onInputChange],
  );

  const {
    closeCommand,
    closeTokenSearch,
    commandFilters,
    commandItems,
    handleTokenSelect,
    openCommandPalette,
    openTokenSearch,
  } = useComposerCommandState({
    applyComposerInsertion,
    focusInputRef: inputRef,
    resolvedDraftState,
  });

  const { handleSend, intentInsights } = useComposerSubmitState({
    attachments: resolvedDraftState.attachments,
    automationStateRef,
    clearAttachments: resolvedDraftState.clearAttachments,
    commandOpen: resolvedDraftState.commandOpen,
    executionPreferences: resolvedExecutionPreferences,
    inputValue,
    isBusy,
    onIntentInsightsChange,
    onSubmit,
    selectedStrategy: selectedModel.strategy,
    tokenSearchOpen: resolvedDraftState.tokenSearchOpen,
  });

  const {
    composerCardMinHeightClass,
    composerCardRadiusClass,
    composerInnerGapClass,
    composerInnerMinHeightClass,
    composerInnerPaddingClass,
    composerInnerRadiusClass,
    composerInputMinHeightClass,
    composerMaxWidthClass,
    composerVoicePanelMinHeightClass,
    composerWidthClass,
    isComposerGradientActive,
    useNexInstantSurface,
  } = resolveDefaultComposerLayout({
    selectedModelValue: selectedModel.value,
    showStarsOverlay,
  });

  const hasInput =
    Boolean(inputValue && inputValue.trim()) ||
    resolvedDraftState.attachments.length > 0;
  const hasVoiceAgent = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const showIntentInsights =
    Boolean(intentInsights.normalizedText) && !hideIntentInsightsPanel;
  const showAppSuggestions = showStarsOverlay && !hidePromptShortcuts;

  const renderSurface = (voiceUi?: ComposerVoiceRendererProps) => (
    <DefaultComposerSurface
      attachments={resolvedDraftState.attachments}
      automationDisabled={automationLoading || automationSaving}
      automationState={automationPreferences}
      className={className}
      composerCardMinHeightClass={composerCardMinHeightClass}
      composerCardRadiusClass={composerCardRadiusClass}
      composerInnerGapClass={composerInnerGapClass}
      composerInnerMinHeightClass={composerInnerMinHeightClass}
      composerInnerPaddingClass={composerInnerPaddingClass}
      composerInnerRadiusClass={composerInnerRadiusClass}
      composerInputMinHeightClass={composerInputMinHeightClass}
      composerStyle={composerStyle}
      composerVoicePanelMinHeightClass={composerVoicePanelMinHeightClass}
      composerWidthClass={composerWidthClass}
      contextUsage={contextUsage}
      disabled={isBusy}
      executionPreferences={resolvedExecutionPreferences}
      hasAttachments={resolvedDraftState.attachments.length > 0}
      hasInput={hasInput}
      hideIntentInsightsPanel={hideIntentInsightsPanel}
      inputRef={inputRef}
      inputValue={inputValue}
      intentInsights={intentInsights}
      isAuthenticated={isAuthenticated}
      isCommandOpen={resolvedDraftState.commandOpen}
      isComposerGradientActive={isComposerGradientActive}
      minimalControls={showStarsOverlay}
      isTokenSearchOpen={resolvedDraftState.tokenSearchOpen}
      messages={messages}
      onAttachmentClick={resolvedDraftState.triggerAttachmentPicker}
      onAutomationToggle={handleAutomationToggle}
      onChange={onInputChange}
      onCommandClose={closeCommand}
      onComposerStyleChange={onComposerStyleChange}
      onExecutionPreferencesChange={handleExecutionPreferencesChange}
      onModelSelect={handleModelSelect}
      onPromptClick={handlePromptClick}
      onRemoveAttachment={resolvedDraftState.removeAttachment}
      onSend={() => void handleSend()}
      onSlashCommand={openCommandPalette}
      onTokenSearch={openTokenSearch}
      onTokenSearchClose={closeTokenSearch}
      options={MODELS}
      selectedModel={selectedModel}
      showIntentInsights={showIntentInsights}
      showStarsOverlay={showStarsOverlay}
      status={status}
      useNexInstantSurface={useNexInstantSurface}
      voiceUi={voiceUi}
    />
  );

  return (
    <ComposerRuntimeShell
      authDialogOpen={resolvedDraftState.authDialogOpen}
      commandFilters={commandFilters}
      commandInputRef={commandInputRef}
      commandItems={commandItems}
      commandOpen={resolvedDraftState.commandOpen}
      commandQuery={resolvedDraftState.commandQuery}
      containerClassName={cn(
        "relative mx-auto flex min-w-0 w-full max-w-full flex-col gap-4 px-2 pb-0 md:px-0",
        COMPOSER_FONT_CLASS,
        composerMaxWidthClass,
      )}
      draftState={resolvedDraftState}
      onAuthNavigation={handleAuthNavigation}
      onCommandClose={closeCommand}
      onModelWarningCancel={handleModelWarningCancel}
      onModelWarningConfirm={handleModelWarningConfirm}
      onPromptClick={handlePromptClick}
      onTokenSearchClose={closeTokenSearch}
      onTokenSelect={handleTokenSelect}
      pendingModelWarning={resolvedDraftState.pendingModelWarning}
      renderSurface={renderSurface}
      showSuggestions={showAppSuggestions}
      tokenSearchInputRef={tokenSearchInputRef}
      voiceAgentId={
        hasVoiceAgent ? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "" : undefined
      }
    />
  );
}
