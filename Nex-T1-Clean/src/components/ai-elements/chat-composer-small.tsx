"use client";

import {
  useCallback,
  useRef,
} from "react";

import { CompactComposerSurface } from "@/components/chat-composer/compact-composer-surface";
import { ComposerRuntimeShell } from "@/components/chat-composer/composer-runtime-shell";
import { MODELS } from "@/components/chat-composer/constants";
import { resolveComposerSizing } from "@/components/chat-composer/composer-sizing";
import { useComposerCommandState } from "@/components/chat-composer/hooks/use-composer-command-state";
import { useCompactComposerTextareaHandlers } from "@/components/chat-composer/hooks/use-compact-composer-textarea-handlers";
import { useCompactComposerTextareaState } from "@/components/chat-composer/hooks/use-compact-composer-textarea-state";
import { useComposerSubmitState } from "@/components/chat-composer/hooks/use-composer-submit-state";
import { useComposerUiState } from "@/components/chat-composer/hooks/use-composer-ui-state";
import type { ChatComposerProps } from "@/components/chat-composer/types";
import type { ComposerVoiceRendererProps } from "@/components/chat-composer/voice-renderer-props";
import { cn } from "@/lib/utils";

export function ChatComposerSmall({
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
  showStarsOverlay = false,
  composerStyle = "small",
  onComposerStyleChange,
  executionPreferences,
  onExecutionPreferencesChange,
  draftState,
}: ChatComposerProps) {
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const tokenSearchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    automationPreferences,
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

  const {
    applyComposerInsertion,
    inputRef,
    setInputRef,
    syncTextareaHeight,
    updateExpandedState,
  } = useCompactComposerTextareaState({
    inputValue,
    onInputChange,
    setExpanded: resolvedDraftState.setIsExpanded,
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
    [inputRef, onInputChange, onPromptSelect],
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
    handleFormSubmit,
    handleTextareaChange,
    handleTextareaKeyDown,
    handleTextareaKeyUp,
  } = useCompactComposerTextareaHandlers({
    closeCommand,
    closeTokenSearch,
    commandOpen: resolvedDraftState.commandOpen,
    onInputChange,
    onSend: () => void handleSend(),
    openCommandPalette,
    openTokenSearch,
    syncTextareaHeight,
    tokenSearchOpen: resolvedDraftState.tokenSearchOpen,
    updateExpandedState,
  });

  const { composerMaxWidthClass, composerWidthClass } = resolveComposerSizing({
    showStarsOverlay,
    variant: "small",
  });
  const hasInput =
    Boolean(inputValue && inputValue.trim()) ||
    resolvedDraftState.attachments.length > 0;
  const hasVoiceAgent = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const isSending = status === "submitted" || status === "streaming";
  const showIntentInsights =
    Boolean(intentInsights.normalizedText) && !hideIntentInsightsPanel;
  const showAppSuggestions = showStarsOverlay && !hidePromptShortcuts;

  const renderSurface = (voiceUi?: ComposerVoiceRendererProps) => (
    <CompactComposerSurface
      attachments={resolvedDraftState.attachments}
      automationState={automationPreferences}
      className={className}
      composerMaxWidthClass={composerMaxWidthClass}
      composerStyle={composerStyle}
      composerWidthClass={composerWidthClass}
      contextUsage={contextUsage}
      executionPreferences={resolvedExecutionPreferences}
      hasInput={hasInput}
      inputValue={inputValue}
      intentInsights={intentInsights}
      isAuthenticated={isAuthenticated}
      isBusy={isBusy}
      isExpanded={resolvedDraftState.isExpanded}
      isSending={isSending}
      onAttachmentClick={resolvedDraftState.triggerAttachmentPicker}
      onAutomationToggle={handleAutomationToggle}
      onComposerStyleChange={onComposerStyleChange}
      onExecutionPreferencesChange={handleExecutionPreferencesChange}
      onFormSubmit={handleFormSubmit}
      onModelSelect={handleModelSelect}
      onPromptClick={handlePromptClick}
      onRemoveAttachment={resolvedDraftState.removeAttachment}
      onTextareaChange={handleTextareaChange}
      onTextareaKeyDown={handleTextareaKeyDown}
      onTextareaKeyUp={handleTextareaKeyUp}
      options={MODELS}
      selectedModel={selectedModel}
      setInputRef={setInputRef}
      showIntentInsights={showIntentInsights}
      showStarsOverlay={showStarsOverlay}
      status={status}
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
      compactSuggestions
      containerClassName={cn(
        "relative mx-auto flex min-w-0 w-full max-w-full flex-col gap-4 px-2 pb-0 font-funnel md:px-0",
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

export default ChatComposerSmall;
