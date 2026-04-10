"use client";

import { forwardRef } from "react";

import { ComposerHighlightedTextarea } from "@/components/chat-composer/composer-highlighted-textarea";
import {
  COMPOSER_INPUT_TEXT_CLASS,
  COMPOSER_PLACEHOLDER_TEXT_CLASS,
} from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";
import {
  findComposerTriggerMatch,
  removeComposerTrigger,
  resolveComposerTriggerAtCursor,
} from "@/components/chat-composer/utils/trigger-detection";

type ComposerInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  isCommandOpen: boolean;
  onCommandClose: () => void;
  onSlashCommand: () => void;
  isTokenSearchOpen: boolean;
  onTokenSearchClose: () => void;
  onTokenSearch: (insertionIndex: number) => void;
  placeholderSlot?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const ComposerInputArea = forwardRef<HTMLTextAreaElement, ComposerInputAreaProps>(
  function ComposerInputArea(
    {
      value,
      onChange,
      onSubmit,
      isCommandOpen,
      onCommandClose,
      onSlashCommand,
      isTokenSearchOpen,
      onTokenSearchClose,
      onTokenSearch,
      placeholderSlot,
      disabled,
      className,
      ariaLabel,
      onFocus,
      onBlur,
    },
    ref,
  ) {
    return (
      <div className={cn("relative", className)}>
        <ComposerHighlightedTextarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-label={ariaLabel ?? "Message prompt"}
          enterKeyHint="send"
          onKeyDown={(event) => {
            if (isCommandOpen || isTokenSearchOpen) {
              if (event.key === "Escape") {
                event.preventDefault();
                if (isCommandOpen) {
                  onCommandClose();
                } else {
                  onTokenSearchClose();
                }
              }
              return;
            }

            if (event.key !== "Enter") return;
            if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
            if (event.nativeEvent.isComposing) return;

            event.preventDefault();
            void onSubmit();
          }}
          onKeyUp={(event) => {
            if (isCommandOpen || isTokenSearchOpen) {
              return;
            }

            const target = event.currentTarget;
            const selectionStart = target.selectionStart ?? 0;
            const trigger = resolveComposerTriggerAtCursor({
              value: target.value,
              selectionStart,
              altKey: event.altKey,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
            });
            if (!trigger) {
              return;
            }

            const match = findComposerTriggerMatch(target.value, selectionStart, trigger);
            if (!match) {
              return;
            }

            event.preventDefault();
            const nextState = removeComposerTrigger(target.value, match);
            target.value = nextState.value;
            onChange(nextState.value);
            target.setSelectionRange(nextState.selectionStart, nextState.selectionStart);

            if (trigger === "/") {
              onSlashCommand();
              return;
            }

            onTokenSearch(nextState.selectionStart);
          }}
          placeholder=""
          overlayClassName={cn(
            "overflow-hidden px-[var(--auth-composer-prompt-padding-x)] pb-[var(--auth-composer-editor-padding-bottom)] pt-[var(--auth-composer-editor-padding-top)]",
            COMPOSER_INPUT_TEXT_CLASS,
            COMPOSER_PLACEHOLDER_TEXT_CLASS,
          )}
          className={cn(
            "field-sizing-content min-h-[var(--auth-composer-editor-min-height)] max-h-[var(--auth-composer-editor-max-height)] w-full resize-none overflow-y-auto rounded-[var(--auth-composer-editor-radius)] border-0 bg-transparent px-[var(--auth-composer-prompt-padding-x)] pb-[var(--auth-composer-editor-padding-bottom)] pt-[var(--auth-composer-editor-padding-top)] shadow-none outline-none focus-visible:ring-0 whitespace-pre-wrap wrap-break-word placeholder:text-[var(--auth-composer-placeholder,var(--muted-foreground))] dark:bg-transparent",
            COMPOSER_INPUT_TEXT_CLASS,
            disabled && "opacity-60",
          )}
        />
        {!value && placeholderSlot}
      </div>
    );
  },
);
