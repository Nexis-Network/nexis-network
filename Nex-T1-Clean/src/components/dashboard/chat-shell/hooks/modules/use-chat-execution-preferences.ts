"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  DEFAULT_CHAT_EXECUTION_PREFERENCES,
  normalizeChatExecutionPreferences,
  type ChatExecutionPreferences,
} from "@/modules/chat/execution-preferences";

const CHAT_EXECUTION_PREFERENCES_STORAGE_KEY = "nex.chat.execution-preferences";
const CHAT_EXECUTION_PREFERENCES_EVENT =
  "nex:chat-execution-preferences-change";
const DEFAULT_CHAT_EXECUTION_PREFERENCES_SERIALIZED = JSON.stringify(
  DEFAULT_CHAT_EXECUTION_PREFERENCES,
);

let cachedExecutionPreferencesSnapshot = DEFAULT_CHAT_EXECUTION_PREFERENCES;
let cachedExecutionPreferencesSerialized: string | null = null;

export type ChatExecutionPreferencesUpdater =
  | ChatExecutionPreferences
  | ((previous: ChatExecutionPreferences) => ChatExecutionPreferences);

function getExecutionPreferencesSnapshot(): ChatExecutionPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_EXECUTION_PREFERENCES;
  }

  try {
    const persistedValue = window.localStorage.getItem(
      CHAT_EXECUTION_PREFERENCES_STORAGE_KEY,
    );

    if (persistedValue === cachedExecutionPreferencesSerialized) {
      return cachedExecutionPreferencesSnapshot;
    }

    if (!persistedValue) {
      cachedExecutionPreferencesSerialized = null;
      cachedExecutionPreferencesSnapshot = DEFAULT_CHAT_EXECUTION_PREFERENCES;
      return cachedExecutionPreferencesSnapshot;
    }

    cachedExecutionPreferencesSerialized = persistedValue;
    cachedExecutionPreferencesSnapshot = normalizeChatExecutionPreferences(
      JSON.parse(persistedValue),
    );
    return cachedExecutionPreferencesSnapshot;
  } catch {
    cachedExecutionPreferencesSerialized =
      DEFAULT_CHAT_EXECUTION_PREFERENCES_SERIALIZED;
    cachedExecutionPreferencesSnapshot = DEFAULT_CHAT_EXECUTION_PREFERENCES;
    return cachedExecutionPreferencesSnapshot;
  }
}

function subscribeToExecutionPreferences(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleExecutionPreferencesChange = () => {
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CHAT_EXECUTION_PREFERENCES_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener(
    CHAT_EXECUTION_PREFERENCES_EVENT,
    handleExecutionPreferencesChange,
  );
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      CHAT_EXECUTION_PREFERENCES_EVENT,
      handleExecutionPreferencesChange,
    );
    window.removeEventListener("storage", handleStorage);
  };
}

function persistExecutionPreferences(nextValue: ChatExecutionPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeChatExecutionPreferences(nextValue);
  const serialized = JSON.stringify(normalized);
  const persistedValue = window.localStorage.getItem(
    CHAT_EXECUTION_PREFERENCES_STORAGE_KEY,
  );

  if (persistedValue === serialized) {
    return;
  }

  window.localStorage.setItem(
    CHAT_EXECUTION_PREFERENCES_STORAGE_KEY,
    serialized,
  );
  cachedExecutionPreferencesSerialized = serialized;
  cachedExecutionPreferencesSnapshot = normalized;
  window.dispatchEvent(new Event(CHAT_EXECUTION_PREFERENCES_EVENT));
}

export function useChatExecutionPreferences() {
  const executionPreferences = useSyncExternalStore(
    subscribeToExecutionPreferences,
    getExecutionPreferencesSnapshot,
    () => DEFAULT_CHAT_EXECUTION_PREFERENCES,
  );

  const setExecutionPreferences = useCallback(
    (updater: ChatExecutionPreferencesUpdater) => {
      const nextValue =
        typeof updater === "function"
          ? updater(getExecutionPreferencesSnapshot())
          : updater;

      persistExecutionPreferences(nextValue);
    },
    [],
  );

  return {
    executionPreferences,
    setExecutionPreferences,
  };
}
