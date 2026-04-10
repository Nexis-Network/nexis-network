"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ChatComposerStyle } from "@/components/chat-composer/types";

const CHAT_COMPOSER_STYLE_STORAGE_KEY = "nex.chat.composer-style";
const CHAT_COMPOSER_STYLE_EVENT = "nex:chat-composer-style-change";
const DEFAULT_CHAT_COMPOSER_STYLE: ChatComposerStyle = "default";

function normalizeComposerStyle(
  value: string | null | undefined,
): ChatComposerStyle {
  return value === "small" ? "small" : "default";
}

function getComposerStyleSnapshot(): ChatComposerStyle {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_COMPOSER_STYLE;
  }

  return normalizeComposerStyle(
    window.localStorage.getItem(CHAT_COMPOSER_STYLE_STORAGE_KEY),
  );
}

function subscribeToComposerStyle(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStyleChange = () => {
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CHAT_COMPOSER_STYLE_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener(CHAT_COMPOSER_STYLE_EVENT, handleStyleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHAT_COMPOSER_STYLE_EVENT, handleStyleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function persistComposerStyle(nextStyle: ChatComposerStyle) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedStyle = normalizeComposerStyle(nextStyle);
  const currentStyle = getComposerStyleSnapshot();

  if (currentStyle === normalizedStyle) {
    return;
  }

  window.localStorage.setItem(
    CHAT_COMPOSER_STYLE_STORAGE_KEY,
    normalizedStyle,
  );
  window.dispatchEvent(new Event(CHAT_COMPOSER_STYLE_EVENT));
}

export function useChatComposerStyle() {
  const composerStyle = useSyncExternalStore(
    subscribeToComposerStyle,
    getComposerStyleSnapshot,
    () => DEFAULT_CHAT_COMPOSER_STYLE,
  );

  const setComposerStyle = useCallback((nextStyle: ChatComposerStyle) => {
    persistComposerStyle(nextStyle);
  }, []);

  return {
    composerStyle,
    setComposerStyle,
  };
}
