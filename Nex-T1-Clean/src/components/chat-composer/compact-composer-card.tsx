"use client";

import { ComposerActionMenu } from "@/components/chat-composer/composer-action-menu";
import { ComposerHighlightedTextarea } from "@/components/chat-composer/composer-highlighted-textarea";
import { APP_CHAT_COMPOSER_PLACEHOLDER_PROMPTS } from "@/components/chat-composer/constants";
import { RotatingVanishPlaceholder } from "@/components/chat-composer/rotating-vanish-placeholder";
import { cn } from "@/lib/utils";

import { CompactComposerFooterBar } from "./compact-composer-footer-bar";
import type { CompactComposerSurfaceProps } from "./compact-composer-surface.types";
import { CompactComposerTrailingControls } from "./compact-composer-trailing-controls";

type CompactComposerCardProps = Pick<
  CompactComposerSurfaceProps,
  | "automationState"
  | "className"
  | "composerMaxWidthClass"
  | "composerStyle"
  | "composerWidthClass"
  | "contextUsage"
  | "executionPreferences"
  | "hasInput"
  | "inputValue"
  | "isAuthenticated"
  | "isBusy"
  | "isExpanded"
  | "isSending"
  | "onAttachmentClick"
  | "onAutomationToggle"
  | "onComposerStyleChange"
  | "onExecutionPreferencesChange"
  | "onModelSelect"
  | "onTextareaChange"
  | "onTextareaKeyDown"
  | "onTextareaKeyUp"
  | "options"
  | "selectedModel"
  | "setInputRef"
  | "showStarsOverlay"
  | "voiceUi"
>;

export function CompactComposerCard({
  automationState,
  className,
  composerMaxWidthClass,
  composerStyle,
  composerWidthClass,
  contextUsage,
  executionPreferences,
  hasInput,
  inputValue,
  isAuthenticated,
  isBusy,
  isExpanded,
  isSending,
  onAttachmentClick,
  onAutomationToggle,
  onComposerStyleChange,
  onExecutionPreferencesChange,
  onModelSelect,
  onTextareaChange,
  onTextareaKeyDown,
  onTextareaKeyUp,
  options,
  selectedModel,
  setInputRef,
  voiceUi,
}: CompactComposerCardProps) {
  const placeholderSlot = (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 overflow-hidden px-0",
        isExpanded
          ? "inset-y-0 pb-2 pt-4"
          : "inset-y-0 flex items-center",
      )}
    >
      <RotatingVanishPlaceholder
        prompts={APP_CHAT_COMPOSER_PLACEHOLDER_PROMPTS}
      />
    </div>
  );
  const isVoicePanelActive = Boolean(voiceUi?.isPanelOpen && voiceUi.panel);

  return (
    <>
      <div
        className={cn(
          "mx-auto w-full max-w-full overflow-clip rounded-3xl border border-border bg-transparent shadow-lg transition-[border-radius] duration-200 ease-out dark:bg-muted/50",
          composerWidthClass,
          composerMaxWidthClass,
          isExpanded ? "p-2.5" : "p-[9px]",
          isExpanded
            ? "grid [grid-template-columns:1fr] [grid-template-rows:1fr_auto] [grid-template-areas:'primary'_'footer']"
            : "grid [grid-template-columns:auto_1fr_auto] [grid-template-rows:1fr] [grid-template-areas:'leading_primary_trailing']",
          className,
        )}
      >
        <div
          className={cn("flex items-center", { hidden: isExpanded })}
          style={{ gridArea: "leading" }}
        >
          <ComposerActionMenu
            onUploadClick={onAttachmentClick}
            automationState={automationState}
            onAutomationToggle={onAutomationToggle}
            isAuthenticated={isAuthenticated}
            triggerVariant="compact"
            modelValue={selectedModel.value}
            modelOptions={options}
            onModelSelect={onModelSelect}
          />
        </div>

        <div
          className={cn(
            "flex min-w-0 overflow-x-hidden px-1.5",
            isExpanded
              ? "mb-0 min-h-14 items-start px-2 py-1"
              : "min-h-[50px] items-center",
          )}
          style={{ gridArea: "primary" }}
        >
          <div className="flex max-h-52 min-w-0 flex-1 overflow-auto">
            {isVoicePanelActive && voiceUi?.panel ? (
              <div className="min-h-[52px]">{voiceUi.panel}</div>
            ) : (
              <div className="relative min-w-0 flex-1">
                <ComposerHighlightedTextarea
                  ref={setInputRef}
                  value={inputValue}
                  onChange={onTextareaChange}
                  onKeyDown={onTextareaKeyDown}
                  onKeyUp={onTextareaKeyUp}
                  placeholder=""
                  disabled={isBusy}
                  rows={1}
                  overlayClassName={cn(
                    "px-0 text-[15px] leading-6 text-foreground",
                    isExpanded ? "pb-2 pt-4" : "py-[5px]",
                  )}
                  className={cn(
                    "w-full resize-none rounded-none border-0 bg-transparent px-0 text-[15px] leading-6 shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
                    isExpanded
                      ? "min-h-[42px] pb-2 pt-4"
                      : "min-h-8 py-[5px]",
                  )}
                />
                {!inputValue ? placeholderSlot : null}
              </div>
            )}
          </div>
        </div>

        <div
          className={cn("flex items-center gap-2", { hidden: isExpanded })}
          style={{ gridArea: "trailing" }}
        >
          <CompactComposerTrailingControls
            hasInput={hasInput}
            isBusy={isBusy}
            isSending={isSending}
            voiceUi={voiceUi}
          />
        </div>

        <div
          className={cn(
            "items-center gap-2 px-1.5",
            isExpanded ? "flex" : "hidden",
          )}
          style={{ gridArea: "footer" }}
        >
          <ComposerActionMenu
            onUploadClick={onAttachmentClick}
            automationState={automationState}
            onAutomationToggle={onAutomationToggle}
            isAuthenticated={isAuthenticated}
            triggerVariant="compact"
            modelValue={selectedModel.value}
            modelOptions={options}
            onModelSelect={onModelSelect}
          />
          <CompactComposerTrailingControls
            hasInput={hasInput}
            isBusy={isBusy}
            isSending={isSending}
            voiceUi={voiceUi}
          />
        </div>
      </div>

      <CompactComposerFooterBar
        composerStyle={composerStyle}
        composerMaxWidthClass={composerMaxWidthClass}
        composerWidthClass={composerWidthClass}
        contextUsage={contextUsage}
        executionPreferences={executionPreferences}
        onComposerStyleChange={onComposerStyleChange}
        onExecutionPreferencesChange={onExecutionPreferencesChange}
        onModelSelect={onModelSelect}
        options={options}
        selectedModel={selectedModel}
        voiceUi={voiceUi}
      />
    </>
  );
}
