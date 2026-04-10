"use client";

import type { ConversationMessage } from "@/components/chat/types";
import { deriveCompatPayloadsFromParts } from "@/lib/chat/native-part-compat";
import { isLocalConversationId } from "./local-conversation-id";

type PersistableMessage = ConversationMessage & {
  createdAt?: string | null;
};

export type LocalConversationRecord = {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
};

const LOCAL_CONVERSATIONS_STORAGE_KEY = "nex-chat-local-conversations";
const LOCAL_CONVERSATION_MESSAGES_PREFIX = "nex-chat-local-messages:";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (!hasStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getMessagesStorageKey(conversationId: string): string {
  return `${LOCAL_CONVERSATION_MESSAGES_PREFIX}${conversationId}`;
}

function generateLocalConversationTitle(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) {
    return "New conversation";
  }

  return cleaned.length <= 50 ? cleaned : `${cleaned.slice(0, 47)}...`;
}

function buildConversationTitle(messages: PersistableMessage[]): string {
  const candidate =
    messages.find((message) => message.role === "user" && message.content?.trim())?.content ??
    messages.find((message) => message.content?.trim())?.content ??
    "New conversation";

  return generateLocalConversationTitle(candidate);
}

function readConversationIndex(): LocalConversationRecord[] {
  return readJson<LocalConversationRecord[]>(LOCAL_CONVERSATIONS_STORAGE_KEY, []);
}

function writeConversationIndex(records: LocalConversationRecord[]): boolean {
  return writeJson(LOCAL_CONVERSATIONS_STORAGE_KEY, records);
}

function readStoredMessages(conversationId: string): PersistableMessage[] {
  return readJson<PersistableMessage[]>(getMessagesStorageKey(conversationId), []);
}

function upsertConversationRecord(
  conversationId: string,
  messages: PersistableMessage[],
): boolean {
  const records = readConversationIndex();
  const existing = records.find((record) => record.id === conversationId) ?? null;
  const now = new Date().toISOString();
  const nextRecord: LocalConversationRecord = {
    id: conversationId,
    user_id: "local",
    title: existing?.title?.trim() ? existing.title : buildConversationTitle(messages),
    model:
      existing?.model ??
      messages.find((message) => typeof message.model === "string" && message.model.trim())
        ?.model ??
      null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const nextRecords = [
    nextRecord,
    ...records.filter((record) => record.id !== conversationId),
  ];

  return writeConversationIndex(nextRecords);
}

function normaliseStoredMessage(message: PersistableMessage): ConversationMessage {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const payloads =
    Array.isArray(message.payloads) && message.payloads.length > 0
      ? message.payloads
      : deriveCompatPayloadsFromParts(parts, {
          includeRightPanelArtifacts: false,
        });

  return {
    ...message,
    content: message.content ?? "",
    parts,
    payloads,
    thoughts: Array.isArray(message.thoughts) ? message.thoughts : [],
    sources: Array.isArray(message.sources) ? message.sources : [],
    status: "ready",
  };
}

export function saveLocalConversationMessage(
  conversationId: string,
  message: PersistableMessage,
): boolean {
  if (!isLocalConversationId(conversationId)) {
    return false;
  }

  const messages = readStoredMessages(conversationId);
  const nextMessages = [
    ...messages.filter((entry) => entry.id !== message.id),
    message,
  ];

  if (!writeJson(getMessagesStorageKey(conversationId), nextMessages)) {
    return false;
  }

  return upsertConversationRecord(conversationId, nextMessages);
}

export function saveLocalConversationMessages(
  conversationId: string,
  messages: PersistableMessage[],
): boolean {
  if (!isLocalConversationId(conversationId)) {
    return false;
  }

  if (!writeJson(getMessagesStorageKey(conversationId), messages)) {
    return false;
  }

  return upsertConversationRecord(conversationId, messages);
}

export function loadLocalConversationMessages(
  conversationId: string,
): ConversationMessage[] {
  if (!isLocalConversationId(conversationId)) {
    return [];
  }

  return readStoredMessages(conversationId).map(normaliseStoredMessage);
}

export function listLocalConversations(
  limit: number = 50,
  offset: number = 0,
): LocalConversationRecord[] {
  return readConversationIndex()
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .slice(offset, offset + limit);
}

export function updateLocalConversationTitle(
  conversationId: string,
  title: string,
): boolean {
  if (!isLocalConversationId(conversationId) || !title.trim()) {
    return false;
  }

  const records = readConversationIndex();
  const existing = records.find((record) => record.id === conversationId);
  if (!existing) {
    return false;
  }

  const nextRecords = records.map((record) =>
    record.id === conversationId
      ? {
          ...record,
          title: title.trim(),
          updated_at: new Date().toISOString(),
        }
      : record,
  );

  return writeConversationIndex(nextRecords);
}

export function deleteLocalConversation(conversationId: string): boolean {
  if (!isLocalConversationId(conversationId)) {
    return false;
  }

  if (hasStorage()) {
    window.localStorage.removeItem(getMessagesStorageKey(conversationId));
  }

  const nextRecords = readConversationIndex().filter(
    (record) => record.id !== conversationId,
  );

  return writeConversationIndex(nextRecords);
}

export function searchLocalConversations(
  query: string,
  limit: number = 20,
  offset: number = 0,
): LocalConversationRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return listLocalConversations(limit, offset);
  }

  return readConversationIndex()
    .filter((record) => record.title.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .slice(offset, offset + limit);
}
