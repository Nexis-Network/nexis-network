import type { SupabaseClient } from "@supabase/supabase-js";
import type { UIMessage } from "ai";

import {
  matchesSupabaseError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { logger } from "@/lib/logger";
import { decodePersistedUIMessages } from "@/modules/chat/persistence/ui-message-codec";
import { sanitizeAssistantTranscriptText } from "@/modules/chat/pipeline/response/planning-filter";
const CLIENT_ID_METADATA_KEY = "clientMessageId";
const MESSAGE_PARTS_METADATA_KEY = "uiParts";
const SOURCE_TAG = "api_chat_route";
let hasWarnedAboutMissingConversationPartsColumn = false;

export type ConversationSummary = {
  id: string;
  title: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummaryPage = {
  conversations: ConversationSummary[];
  hasMore: boolean;
  nextOffset: number | null;
};

function sanitizeTitle(input?: string | null): string {
  if (!input) {
    return "New conversation";
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return "New conversation";
  }
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77).trimEnd()}...`;
}

function sanitizeIsoDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  try {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  } catch {
    return undefined;
  }
}

function toJsonSerializable(value: UntypedJson): Record<string, UntypedJson> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, UntypedJson>;
  } catch {
    return undefined;
  }
}

export function extractTextFromUIMessage(message: UIMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const text = parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      if ((part as { type?: string }).type === "text" && typeof (part as { text?: UntypedJson }).text === "string") {
        return (part as { text: string }).text;
      }
      if ((part as { type?: string }).type === "reasoning" && typeof (part as { text?: UntypedJson }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .filter((segment) => Boolean(segment?.trim()))
    .join("\n")
    .trim();

  return text;
}

function toJsonSerializableParts(
  parts: UIMessage["parts"] | undefined,
): UIMessage["parts"] {
  if (!Array.isArray(parts)) {
    return [];
  }

  try {
    return JSON.parse(JSON.stringify(parts)) as UIMessage["parts"];
  } catch {
    return [];
  }
}

export function generateConversationTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const candidate = firstUser ? extractTextFromUIMessage(firstUser) : null;
  return sanitizeTitle(candidate);
}

export async function ensureConversationRecord(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null | undefined,
  options: { title?: string | null; model?: string | null } = {},
): Promise<{ id: string; created: boolean }> {
  let normalizedId = typeof conversationId === "string" && conversationId.trim().length > 0 ? conversationId.trim() : null;

  if (normalizedId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", normalizedId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.id) {
      return { id: data.id, created: false };
    }

    if (error && process.env.NODE_ENV !== "production") {
      logger.info("conversation_record_invalid", {
        conversationId: normalizedId,
        error: error.message,
      });
    }

    normalizedId = null;
  }

  const payload = {
    user_id: userId,
    title: sanitizeTitle(options.title),
    model: options.model ?? null,
  } satisfies Record<string, UntypedJson>;

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create conversation record: ${error?.message ?? "unknown error"}`);
  }

  return { id: data.id, created: true };
}

export async function persistConversationMessage(options: {
  supabase: SupabaseClient;
  conversationId: string;
  message: UIMessage;
  fallbackContent?: string | null;
  createdAt?: string | Date | null;
}): Promise<boolean> {
  const { supabase, conversationId, message, fallbackContent, createdAt } = options;

  if (!message || (message.role !== "user" && message.role !== "assistant")) {
    return false;
  }

  const clientMessageId = typeof message.id === "string" ? message.id.trim() : "";
  if (!clientMessageId) {
    return false;
  }

  const { data: existing } = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq(`metadata->>${CLIENT_ID_METADATA_KEY}`, clientMessageId)
    .maybeSingle();

  if (existing?.id) {
    return false;
  }

  const resolvedContent = fallbackContent ?? extractTextFromUIMessage(message);
  const content =
    message.role === "assistant"
      ? sanitizeAssistantTranscriptText(resolvedContent)
      : resolvedContent;
  const metadata = {
    [CLIENT_ID_METADATA_KEY]: clientMessageId,
    role: message.role,
    source: SOURCE_TAG,
    uiMetadata: toJsonSerializable(message.metadata),
  } satisfies Record<string, UntypedJson>;

  const payload: Record<string, UntypedJson> = {
    conversation_id: conversationId,
    role: message.role,
    content: content ?? null,
    parts: toJsonSerializableParts(message.parts),
    metadata,
  };

  const isoDate = sanitizeIsoDate(createdAt);
  if (isoDate) {
    payload.created_at = isoDate;
  }

  let { error } = await supabase.from("conversation_messages").insert(payload);
  if (
    error &&
    matchesSupabaseError(error, {
      codes: ["42703", "PGRST204"],
      messagePatterns: [
        /column .*parts.* does not exist/i,
        /Could not find the 'parts' column/i,
      ],
    })
  ) {
    if (!hasWarnedAboutMissingConversationPartsColumn) {
      hasWarnedAboutMissingConversationPartsColumn = true;
      logger.warn("conversation_message_parts_column_missing", {
        conversationId,
        error: toSupabaseLogContext(error),
      });
    }

    const { parts: _parts, ...legacyPayload } = payload;
    const legacyMetadata =
      legacyPayload.metadata && typeof legacyPayload.metadata === "object"
        ? {
            ...(legacyPayload.metadata as Record<string, UntypedJson>),
            [MESSAGE_PARTS_METADATA_KEY]: toJsonSerializableParts(message.parts),
          }
        : legacyPayload.metadata;
    const retryResult = await supabase
      .from("conversation_messages")
      .insert({
        ...legacyPayload,
        metadata: legacyMetadata,
      });
    error = retryResult.error;
  }

  if (error) {
    logger.error("conversation_message_persist_failed", {
      conversationId,
      role: message.role,
      messageId: clientMessageId,
      error: error.message,
      supabaseError: toSupabaseLogContext(error),
    });
    return false;
  }

  return true;
}

export async function fetchConversationSummaries(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number; search?: string | null } = {},
): Promise<ConversationSummaryPage> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  type ConversationRow = {
    id: string;
    title: string | null;
    model: string | null;
    created_at: string;
    updated_at: string;
  };

  let query = supabase
    .from("conversations")
    .select("id, title, model, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit);

  if (options.search && options.search.trim().length > 0) {
    query = query.ilike("title", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    logger.error("conversation_summaries_fetch_failed", {
      userId,
      error: error.message,
    });
    return {
      conversations: [],
      hasMore: false,
      nextOffset: null,
    };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const conversations = rows.slice(0, limit).map((row: ConversationRow) => ({
    id: row.id,
    title: sanitizeTitle(row.title),
    model: row.model ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    conversations,
    hasMore,
    nextOffset: hasMore ? offset + conversations.length : null,
  };
}

export async function fetchConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<UIMessage[]> {
  type PersistedConversationMessageRow = {
    id: string;
    role: string;
    content: string | null;
    parts: unknown;
    metadata: UntypedJson | null;
    created_at: string | null;
  };

  // Defense-in-depth: verify conversation ownership before loading messages.
  // This guards against IDOR even if RLS is misconfigured or bypassed.
  const { data: ownerCheck, error: ownerError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownerError || !ownerCheck) {
    logger.warn("conversation_messages_access_denied", {
      conversationId,
      userId,
      error: ownerError?.message ?? "conversation not owned by user",
    });
    return [];
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("conversation_messages_fetch_failed", {
      conversationId,
      userId,
      error: error.message,
    });
    return [];
  }

  if (!data) return [];

  return decodePersistedUIMessages(
    (data as PersistedConversationMessageRow[]).map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, UntypedJson>)
          : null;
      const partsFromMetadata = Array.isArray(metadata?.[MESSAGE_PARTS_METADATA_KEY])
        ? metadata[MESSAGE_PARTS_METADATA_KEY]
        : [];
      const clientMessageId = metadata?.[CLIENT_ID_METADATA_KEY];

      return {
        id: typeof clientMessageId === "string" && clientMessageId.trim() ? clientMessageId : row.id,
        role: row.role,
        parts: Array.isArray(row.parts) ? row.parts : partsFromMetadata,
      };
    }),
  );
}
