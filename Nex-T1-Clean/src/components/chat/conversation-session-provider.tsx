"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

import { useConversationPersistence } from "@/hooks/chat/use-conversation-persistence";
import { useChatMessages } from "@/hooks/chat/use-chat-messages";
import { trackAgentEvent } from "@/modules/analytics/events";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import { deriveCompatPayloadsFromParts } from "@/lib/chat/native-part-compat";
import { useLocalConversationAutosave } from "@/components/chat/use-local-conversation-autosave";

type HistorySyncListener = (messages: ConversationMessage[]) => void;

type ConversationSessionValue = ReturnType<typeof useConversationPersistence> &
  ReturnType<typeof useChatMessages> & {
    loadConversationIntoChat: (conversationId: string) => Promise<ConversationMessage[]>;
    startFreshConversation: () => void;
    registerHistorySyncListener: (listener: HistorySyncListener) => () => void;
    historySyncVersion: number;
    openedDocumentId: string | null;
    setOpenedDocumentId: (id: string | null) => void;
  };

const ConversationSessionContext = createContext<ConversationSessionValue | null>(null);

export function ConversationSessionProvider({
  children,
  initialConversationId,
}: {
  children: React.ReactNode;
  initialConversationId?: string | null;
}) {
  const persistence = useConversationPersistence({
    autoSave: true,
    conversationId: initialConversationId ?? null,
  });
  const {
    currentConversationId,
    loadConversation,
    startNewConversation,
  } = persistence;
  const {
    messages,
    appendMessage,
    updateMessage,
    removeMessage,
    replaceMessages,
    clearMessages,
    getReadyHistory,
  } = useChatMessages();

  const [openedDocumentId, setOpenedDocumentId] = useState<string | null>(null);
  const [historySyncVersion, setHistorySyncVersion] = useState(0);
  const restoredConversationIdRef = useRef<string | null>(null);
  const historySyncListenersRef = useRef(new Set<HistorySyncListener>());

  useLocalConversationAutosave({
    conversationId: currentConversationId,
    messages,
    persistMessages: persistence.persistMessages,
  });

  const registerHistorySyncListener = useCallback((listener: HistorySyncListener) => {
    historySyncListenersRef.current.add(listener);

    return () => {
      historySyncListenersRef.current.delete(listener);
    };
  }, []);

  const notifyHistorySyncListeners = useCallback((nextMessages: ConversationMessage[]) => {
    for (const listener of historySyncListenersRef.current) {
      listener(nextMessages);
    }
  }, []);

  const loadConversationIntoChat = useCallback(
    async (conversationId: string) => {
      const loaded = await loadConversation(conversationId);
      notifyHistorySyncListeners(loaded);
      replaceMessages(loaded);
      setHistorySyncVersion((previous) => previous + 1);
      if (loaded.length) {
        trackAgentEvent("conversation_loaded", {
          conversationId,
          messageCount: loaded.length,
        });
      }
      return loaded;
    },
    [loadConversation, notifyHistorySyncListeners, replaceMessages],
  );

  const processedIdsRef = useRef(new Set<string>());

  // Keep the processed-IDs set in sync with current messages so that
  // locally-created messages are never re-inserted from a Realtime INSERT.
  useEffect(() => {
    const next = new Set(messages.map((m) => m.id));
    processedIdsRef.current = next;
  }, [messages]);

  useEffect(() => {
    const conversationId = currentConversationId;
    if (!conversationId || messages.length > 0 || restoredConversationIdRef.current === conversationId) {
      return;
    }

    restoredConversationIdRef.current = conversationId;

    let cancelled = false;
    void loadConversation(conversationId).then((loaded) => {
      if (cancelled) {
        return;
      }

      replaceMessages(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [currentConversationId, loadConversation, messages.length, replaceMessages]);

  useEffect(() => {
    // Only subscribe if we have an active conversation
    if (!currentConversationId) return;

    // Defer realtime subscription to avoid blocking initial render/hydration
    let supabaseRef: ReturnType<typeof createClient> | null = null;
    let channelRef: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    const timerId = window.setTimeout(() => {
      supabaseRef = createClient();
      const channelName = `conversation:${currentConversationId}`;

      channelRef = supabaseRef
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversation_messages",
            filter: `conversation_id=eq.${currentConversationId}`,
          },
          (payload: RealtimePostgresChangesPayload<Record<string, UntypedJson>>) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === "INSERT" && newRecord) {
              if (processedIdsRef.current.has(newRecord.id as string)) return;
              processedIdsRef.current.add(newRecord.id as string);

              const incoming = newRecord;
              const mapped: ConversationMessage = {
                id: incoming.id,
                role: incoming.role ?? "user",
                content: incoming.content ?? "",
                parts: incoming.parts ?? [],
                status: "ready",
                agent: null,
                model: "gpt-4o",
                thoughts: [],
                payloads:
                  (Array.isArray(incoming.payloads) && incoming.payloads.length > 0)
                    ? incoming.payloads
                    : deriveCompatPayloadsFromParts(
                        Array.isArray(incoming.parts) ? incoming.parts : undefined,
                        { includeRightPanelArtifacts: false },
                      ),
                sources: incoming.sources ?? [],
                suggestions: [],
                followUpQuestions: [],
                requestedTickers: [],
              };
              appendMessage(mapped);
            } else if (eventType === "UPDATE" && newRecord) {
              const incoming = newRecord;
              updateMessage(incoming.id, (prev) => ({
                ...prev,
                content: incoming.content ?? prev.content,
                parts: incoming.parts ?? prev.parts,
                payloads:
                  (Array.isArray(incoming.payloads) && incoming.payloads.length > 0)
                    ? incoming.payloads
                    : deriveCompatPayloadsFromParts(
                        Array.isArray(incoming.parts) ? incoming.parts : prev.parts,
                        { includeRightPanelArtifacts: false },
                      ),
                sources: incoming.sources ?? prev.sources,
              }));
            } else if (eventType === "DELETE" && oldRecord) {
              removeMessage(oldRecord.id as string);
            }
          },
        )
        .subscribe();
    }, 500);

    return () => {
      window.clearTimeout(timerId);
      if (channelRef && supabaseRef) {
        channelRef.unsubscribe();
        supabaseRef.removeChannel(channelRef);
      }
    };
  }, [
    currentConversationId,
    appendMessage,
    updateMessage,
    removeMessage,
  ]);

  const startFreshConversation = useCallback(() => {
    restoredConversationIdRef.current = null;
    notifyHistorySyncListeners([]);
    clearMessages();
    startNewConversation();
    setHistorySyncVersion((previous) => previous + 1);
  }, [clearMessages, notifyHistorySyncListeners, startNewConversation]);

  const value = useMemo(
    () => ({
      ...persistence,
      messages,
      appendMessage,
      updateMessage,
      removeMessage,
      replaceMessages,
      clearMessages,
      getReadyHistory,
      loadConversationIntoChat,
      startFreshConversation,
      registerHistorySyncListener,
      historySyncVersion,
      openedDocumentId,
      setOpenedDocumentId,
    }),
    [
      persistence,
      messages,
      appendMessage,
      updateMessage,
      removeMessage,
      replaceMessages,
      clearMessages,
      getReadyHistory,
      loadConversationIntoChat,
      startFreshConversation,
      registerHistorySyncListener,
      historySyncVersion,
      openedDocumentId,
      setOpenedDocumentId,
    ],
  );

  return <ConversationSessionContext.Provider value={value}>{children}</ConversationSessionContext.Provider>;
}

export function useConversationSession() {
  const context = useContext(ConversationSessionContext);
  if (!context) {
    throw new Error("useConversationSession must be used within a ConversationSessionProvider");
  }
  return context;
}
