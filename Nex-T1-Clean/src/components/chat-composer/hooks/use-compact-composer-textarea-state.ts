"use client";

import { useCallback, useEffect, useRef } from "react";

import { insertTextAtCursor } from "@/components/chat-composer/utils/trigger-detection";

type UseCompactComposerTextareaStateArgs = {
  inputValue: string;
  onInputChange: (value: string) => void;
  setExpanded: (expanded: boolean) => void;
};

export function useCompactComposerTextareaState({
  inputValue,
  onInputChange,
  setExpanded,
}: UseCompactComposerTextareaStateArgs) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateExpandedState = useCallback(
    (value: string) => {
      setExpanded(value.length > 100 || value.includes("\n"));
    },
    [setExpanded],
  );

  const syncTextareaHeight = useCallback(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      208,
    )}px`;
  }, []);

  const applyComposerInsertion = useCallback(
    (text: string, insertionIndex?: number | null) => {
      const selectionStart =
        insertionIndex ??
        textareaRef.current?.selectionStart ??
        inputValue.length;
      const selectionEnd =
        insertionIndex ??
        textareaRef.current?.selectionEnd ??
        selectionStart;
      const nextState = insertTextAtCursor(
        inputValue,
        selectionStart,
        selectionEnd,
        text,
      );

      onInputChange(nextState.value);
      updateExpandedState(nextState.value);
      requestAnimationFrame(() => {
        syncTextareaHeight();
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          nextState.selectionStart,
          nextState.selectionStart,
        );
      });
    },
    [inputValue, onInputChange, syncTextareaHeight, updateExpandedState],
  );

  const setInputRef = useCallback((element: HTMLTextAreaElement | null) => {
    textareaRef.current = element;
    inputRef.current = element;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
    updateExpandedState(inputValue);
  }, [inputValue, syncTextareaHeight, updateExpandedState]);

  return {
    applyComposerInsertion,
    inputRef,
    setInputRef,
    syncTextareaHeight,
    updateExpandedState,
  };
}
