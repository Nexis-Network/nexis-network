/**
 * Conversation Persistence Hook
 * Auto-save conversations to Supabase
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createConversation,
  saveMessage,
  saveMessages,
  loadConversationMessages,
  listConversations,
  generateConversationTitle,
} from "@/modules/chat/persistence/supabase-store";
import type { ConversationMessage } from "@/components/chat/types";
import { isNonProductionClientTestMode } from "@/lib/utils/is-non-production-client-test-mode";
import {
  createLocalConversationId,
  isLocalConversationId,
} from "@/modules/chat/persistence/local-conversation-id";
import { shouldResumeChatStreamOnMount } from "./chat-resume-storage";

type UseConversationPersistenceOptions = {
  autoSave?: boolean;
  conversationId?: string | null;
};

const ACTIVE_CONVERSATION_STORAGE_KEY = "nex-chat-current-conversation-id";

function normalizeConversationId(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStoredConversationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeConversationId(window.sessionStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredConversationId(conversationId: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (conversationId) {
      window.sessionStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, conversationId);
    } else {
      window.sessionStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write failures.
  }
}

export function useConversationPersistence(options: UseConversationPersistenceOptions = {}) {
  const { autoSave = true, conversationId: initialConversationId = null } = options;
  const testMode = isNonProductionClientTestMode();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    () => normalizeConversationId(initialConversationId),
  );
  const resumeStreamOnMount = useMemo(
    () =>
      testMode ? false : shouldResumeChatStreamOnMount(currentConversationId),
    [currentConversationId, testMode],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const setCurrentConversation = useCallback((conversationId: string | null) => {
    const normalizedConversationId = normalizeConversationId(conversationId);
    const nextConversationId =
      testMode &&
      normalizedConversationId &&
      !isLocalConversationId(normalizedConversationId)
        ? null
        : normalizedConversationId;
    setCurrentConversationId(nextConversationId);
    writeStoredConversationId(nextConversationId);
  }, [testMode]);

  useEffect(() => {
    const normalizedInitialConversationId = normalizeConversationId(initialConversationId);
    if (
      !normalizedInitialConversationId ||
      (testMode && !isLocalConversationId(normalizedInitialConversationId))
    ) {
      return;
    }

    setCurrentConversation(normalizedInitialConversationId);
  }, [initialConversationId, setCurrentConversation, testMode]);

  useEffect(() => {
    if (normalizeConversationId(initialConversationId) || currentConversationId) {
      return;
    }

    const storedConversationId = readStoredConversationId();
    if (
      !storedConversationId ||
      (testMode && !isLocalConversationId(storedConversationId))
    ) {
      return;
    }

    setCurrentConversation(storedConversationId);
  }, [currentConversationId, initialConversationId, setCurrentConversation, testMode]);

  // Create new conversation
  const createNewConversation = useCallback(
    async (firstMessage: string, model: string) => {
      if (testMode) {
        const conversationId = createLocalConversationId();
        setCurrentConversation(conversationId);
        return conversationId;
      }

      const title = generateConversationTitle(firstMessage);
      const conversationId = await createConversation(title, model);

      if (conversationId) {
        setCurrentConversation(conversationId);
      }

      return conversationId;
    },
    [setCurrentConversation, testMode]
  );

  // Save single message
  const persistMessage = useCallback(
    async (
      message: ConversationMessage,
      options: { conversationId?: string } = {}
    ) => {
      if (!autoSave) return false;

      const targetConversationId = options.conversationId ?? currentConversationId;
      if (!targetConversationId) return false;

      setIsSaving(true);
      const success = await saveMessage(targetConversationId, message);
      setIsSaving(false);

      return success;
    },
    [autoSave, currentConversationId]
  );

  const persistMessages = useCallback(
    async (
      messages: ConversationMessage[],
      options: { conversationId?: string } = {}
    ) => {
      if (!autoSave) {
        return { saved: 0, attempted: 0 } as const;
      }

      const targetConversationId = options.conversationId ?? currentConversationId;
      if (!targetConversationId) {
        return { saved: 0, attempted: 0 } as const;
      }

      setIsSaving(true);
      const result = await saveMessages(targetConversationId, messages);
      setIsSaving(false);

      return result;
    },
    [autoSave, currentConversationId]
  );

  // Load conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    const messages = await loadConversationMessages(conversationId);
    setIsLoading(false);
    setCurrentConversation(conversationId);

    return messages;
  }, [setCurrentConversation]);

  // Get user's conversations
  const getConversations = useCallback(async (limit: number = 50) => {
    return await listConversations(limit);
  }, []);

  // Start new conversation (clear current)
  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
  }, [setCurrentConversation]);

  return {
    currentConversationId,
    resumeStreamOnMount,
    isLoading,
    isSaving,
    createNewConversation,
    persistMessage,
    persistMessages,
    loadConversation,
    getConversations,
    startNewConversation,
    setCurrentConversationId: setCurrentConversation,
  };
}
