"use client";

import { useCallback, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";

import {
  findComposerTriggerMatch,
  removeComposerTrigger,
  resolveComposerTriggerAtCursor,
} from "@/components/chat-composer/utils/trigger-detection";

type UseCompactComposerTextareaHandlersArgs = {
  closeCommand: () => void;
  closeTokenSearch: () => void;
  commandOpen: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  openCommandPalette: () => void;
  openTokenSearch: (index: number) => void;
  syncTextareaHeight: () => void;
  tokenSearchOpen: boolean;
  updateExpandedState: (value: string) => void;
};

export function useCompactComposerTextareaHandlers({
  closeCommand,
  closeTokenSearch,
  commandOpen,
  onInputChange,
  onSend,
  openCommandPalette,
  openTokenSearch,
  syncTextareaHeight,
  tokenSearchOpen,
  updateExpandedState,
}: UseCompactComposerTextareaHandlersArgs) {
  const handleFormSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      onSend();
    },
    [onSend],
  );

  const handleTextareaChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onInputChange(event.target.value);
      updateExpandedState(event.target.value);
      syncTextareaHeight();
    },
    [onInputChange, syncTextareaHeight, updateExpandedState],
  );

  const handleTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (commandOpen || tokenSearchOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          if (commandOpen) {
            closeCommand();
          } else {
            closeTokenSearch();
          }
        }
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleFormSubmit();
      }
    },
    [
      closeCommand,
      closeTokenSearch,
      commandOpen,
      handleFormSubmit,
      tokenSearchOpen,
    ],
  );

  const handleTextareaKeyUp = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (commandOpen || tokenSearchOpen) {
        return;
      }

      const selectionStart = event.currentTarget.selectionStart ?? 0;
      const trigger = resolveComposerTriggerAtCursor({
        value: event.currentTarget.value,
        selectionStart,
        altKey: event.altKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      });
      if (!trigger) {
        return;
      }

      const match = findComposerTriggerMatch(
        event.currentTarget.value,
        selectionStart,
        trigger,
      );
      if (!match) {
        return;
      }

      event.preventDefault();
      const nextState = removeComposerTrigger(event.currentTarget.value, match);
      onInputChange(nextState.value);
      updateExpandedState(nextState.value);
      setTimeout(() => {
        event.currentTarget.setSelectionRange(
          nextState.selectionStart,
          nextState.selectionStart,
        );
        syncTextareaHeight();
      }, 0);

      if (trigger === "/") {
        openCommandPalette();
        return;
      }

      openTokenSearch(nextState.selectionStart);
    },
    [
      commandOpen,
      onInputChange,
      openCommandPalette,
      openTokenSearch,
      syncTextareaHeight,
      tokenSearchOpen,
      updateExpandedState,
    ],
  );

  return {
    handleFormSubmit,
    handleTextareaChange,
    handleTextareaKeyDown,
    handleTextareaKeyUp,
  };
}
