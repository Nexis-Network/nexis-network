import "server-only";

import type { UIMessage } from "ai";

import { decodePersistedUIMessages } from "@/modules/chat/persistence/ui-message-codec";
import {
  extractTextFromUIMessage,
  generateConversationTitle,
} from "@/server/chat/conversation-store";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

type ConversationRow = {
  id: string;
  user_id?: string;
  title: string | null;
  model?: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string | null;
  parts: unknown[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type MobileChatHistoryRecord = {
  userId: string;
  conversationId: string;
  agentId: string | null;
  messages: UIMessage[];
  createdAt: string;
  updatedAt: string;
};

type ListConversationParams = {
  page: number;
  pageSize: number;
  search: string | null;
  sortOrder: "asc" | "desc";
};

const CLIENT_MESSAGE_ID_KEY = "clientMessageId";
const SOURCE_TAG = "ai_chat_history_route";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return fallback;
}

function normalizeUiMetadata(
  metadata: Record<string, unknown> | null,
  createdAtIso: string,
): Record<string, unknown> {
  const sourceMetadata = isRecord(metadata?.uiMetadata)
    ? { ...metadata.uiMetadata }
    : {};

  if (sourceMetadata.createdAt === undefined) {
    sourceMetadata.createdAt = Date.parse(createdAtIso);
  }

  return sourceMetadata;
}

function deriveAgentId(messages: readonly UIMessage[]): string | null {
  for (const message of messages) {
    if (isRecord(message.metadata) && typeof message.metadata.agentId === "string") {
      const agentId = message.metadata.agentId.trim();
      if (agentId.length > 0) {
        return agentId;
      }
    }
  }

  return null;
}

function buildStoredMessageCandidate(
  row: ConversationMessageRow,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const messageId =
    typeof row.metadata?.[CLIENT_MESSAGE_ID_KEY] === "string" &&
    row.metadata[CLIENT_MESSAGE_ID_KEY].trim().length > 0
      ? row.metadata[CLIENT_MESSAGE_ID_KEY].trim()
      : row.id;

  return {
    id: messageId,
    role: row.role,
    parts: Array.isArray(row.parts) ? row.parts : [],
    metadata,
  };
}

async function loadConversationMessages(
  conversationId: string,
): Promise<ConversationMessageRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("conversation_messages")
    .select("id, role, content, parts, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load conversation messages");
  }

  return (data ?? []) as ConversationMessageRow[];
}

async function buildHistoryRecord(
  userId: string,
  conversation: ConversationRow,
  messageRows: readonly ConversationMessageRow[],
): Promise<MobileChatHistoryRecord> {
  const messages = await decodePersistedUIMessages(
    messageRows.map((row) => {
      const metadata = normalizeUiMetadata(row.metadata, row.created_at);
      return buildStoredMessageCandidate(row, metadata);
    }),
  );

  return {
    userId,
    conversationId: conversation.id,
    agentId: deriveAgentId(messages),
    messages,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

function sanitizePersistedMessages(messages: readonly UIMessage[]): UIMessage[] {
  return messages.filter(
    (message): message is UIMessage =>
      Boolean(message) &&
      (message.role === "user" || message.role === "assistant") &&
      Array.isArray(message.parts),
  );
}

function buildConversationMessageInsertRows(params: {
  conversationId: string;
  messages: readonly UIMessage[];
  agentId: string | null;
}) {
  const nowIso = new Date().toISOString();

  return sanitizePersistedMessages(params.messages).map((message) => {
    const metadata = isRecord(message.metadata) ? { ...message.metadata } : {};
    if (params.agentId && typeof metadata.agentId !== "string") {
      metadata.agentId = params.agentId;
    }

    const createdAtIso = toIsoString(metadata.createdAt, nowIso);

    return {
      conversation_id: params.conversationId,
      role: message.role,
      content: extractTextFromUIMessage(message),
      parts: message.parts,
      metadata: {
        [CLIENT_MESSAGE_ID_KEY]: message.id,
        role: message.role,
        source: SOURCE_TAG,
        uiMetadata: metadata,
      },
      created_at: createdAtIso,
    };
  });
}

export async function listMobileConversations(
  userId: string,
  params: ListConversationParams,
) {
  const admin = getSupabaseAdminClient();
  const from = Math.max(0, (params.page - 1) * params.pageSize);
  const to = from + params.pageSize - 1;

  let query = admin
    .from("conversations")
    .select("id, title, model, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: params.sortOrder === "asc" });

  if (params.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message || "Failed to load conversations");
  }

  const total = count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / params.pageSize) : 0;

  return {
    data: ((data ?? []) as ConversationRow[]).map((conversation) => ({
      id: conversation.id,
      title: conversation.title ?? "New conversation",
      summary: null,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: [],
    })),
    total,
    page: params.page,
    page_size: params.pageSize,
    total_pages: totalPages,
    has_next_page: params.page < totalPages,
    has_previous_page: params.page > 1 && totalPages > 0,
  };
}

export async function listMobileChatHistories(
  userId: string,
): Promise<MobileChatHistoryRecord[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(0, 49);

  if (error) {
    throw new Error(error.message || "Failed to load chat histories");
  }

  const conversations = (data ?? []) as ConversationRow[];
  const histories = await Promise.all(
    conversations.map(async (conversation) =>
      buildHistoryRecord(userId, conversation, await loadConversationMessages(conversation.id)),
    ),
  );

  return histories;
}

export async function getMobileChatHistory(
  userId: string,
  conversationId: string,
): Promise<MobileChatHistoryRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load chat history");
  }

  if (!data) {
    return null;
  }

  const conversation = data as ConversationRow;
  const messages = await loadConversationMessages(conversation.id);
  return await buildHistoryRecord(userId, conversation, messages);
}

export async function replaceMobileChatHistory(params: {
  userId: string;
  conversationId: string;
  messages: readonly UIMessage[];
  agentId: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: existing, error: lookupError } = await admin
    .from("conversations")
    .select("id, user_id, model, created_at")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message || "Failed to load existing conversation");
  }

  if (existing?.user_id && existing.user_id !== params.userId) {
    throw new Error("Conversation does not belong to the authenticated user");
  }

  const sanitizedMessages = sanitizePersistedMessages(params.messages);
  const title =
    sanitizedMessages.length > 0
      ? generateConversationTitle(sanitizedMessages)
      : "New conversation";

  const { data: upsertedConversation, error: upsertError } = await admin
    .from("conversations")
    .upsert(
      {
        id: params.conversationId,
        user_id: params.userId,
        title,
        model: existing?.model ?? null,
        updated_at: nowIso,
      },
      { onConflict: "id" },
    )
    .select("id, created_at, updated_at")
    .single();

  if (upsertError || !upsertedConversation) {
    throw new Error(upsertError?.message || "Failed to upsert conversation");
  }

  const { error: deleteError } = await admin
    .from("conversation_messages")
    .delete()
    .eq("conversation_id", params.conversationId);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to replace conversation messages");
  }

  const messageRows = buildConversationMessageInsertRows({
    conversationId: params.conversationId,
    messages: sanitizedMessages,
    agentId: params.agentId,
  });

  if (messageRows.length > 0) {
    const { error: insertError } = await admin
      .from("conversation_messages")
      .insert(messageRows);

    if (insertError) {
      throw new Error(insertError.message || "Failed to persist conversation messages");
    }
  }

  return {
    userId: params.userId,
    conversationId: params.conversationId,
    agentId: params.agentId ?? deriveAgentId(sanitizedMessages),
    messages: sanitizedMessages,
    createdAt:
      typeof upsertedConversation.created_at === "string"
        ? upsertedConversation.created_at
        : existing?.created_at ?? nowIso,
    updatedAt:
      typeof upsertedConversation.updated_at === "string"
        ? upsertedConversation.updated_at
        : nowIso,
  } satisfies MobileChatHistoryRecord;
}

export async function deleteMobileChatHistory(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("id, user_id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load conversation");
  }

  if (!data) {
    return false;
  }

  const { error: deleteError } = await admin
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete conversation");
  }

  return true;
}
