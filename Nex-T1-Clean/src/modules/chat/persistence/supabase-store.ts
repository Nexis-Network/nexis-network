/**
 * Conversation Persistence - Supabase Store
 * Save and load conversations from database
 */

import { createBrowserClient } from "@supabase/ssr";
import type { ConversationMessage } from "@/components/chat/types";

import { deriveCompatPayloadsFromParts } from "@/lib/chat/native-part-compat";
import { logger } from "@/lib/logger";
import {
  createLocalConversationId,
  isLocalConversationId,
} from "@/modules/chat/persistence/local-conversation-id";
import {
  deleteLocalConversation,
  listLocalConversations,
  loadLocalConversationMessages,
  saveLocalConversationMessage,
  saveLocalConversationMessages,
  searchLocalConversations,
  updateLocalConversationTitle as updateStoredLocalConversationTitle,
} from "@/modules/chat/persistence/local-conversation-store";
type PersistableMessage = ConversationMessage & {
  createdAt?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

type SupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: SupabaseClient | null = null;

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string | null;
  parts: UntypedJson;
  payloads: UntypedJson;
  thoughts: UntypedJson;
  sources: UntypedJson;
  metadata: UntypedJson;
  created_at: string;
};

// Create Supabase client (browser-side)
function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("conversation_persistence_disabled_missing_supabase_env");
    }
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  status?: number | null;
};

const SUPABASE_OPTIONAL_ERROR_CODES = new Set([
  "42P01",
  "42501",
  "PGRST301",
  "PGRST100",
]);

const silencedSupabaseErrors = new Set<string>();
const SUPABASE_OPTIONAL_CONTEXTS = new Set([
  "Failed to create conversation",
  "Failed to list conversations",
  "Failed to save message",
  "Failed to load messages",
  "Failed to update conversation title",
  "Failed to delete conversation",
  "Failed to search conversations",
]);

function normaliseSupabaseError(error: UntypedJson): SupabaseErrorLike {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : null };
  }
  const maybeError = error as SupabaseErrorLike & Record<string, UntypedJson>;
  const fallbackMessage =
    typeof maybeError.message === "string" && maybeError.message.length > 0
      ? maybeError.message
      : typeof maybeError.details === "string" && maybeError.details.length > 0
        ? maybeError.details
        : typeof maybeError.hint === "string" && maybeError.hint.length > 0
          ? maybeError.hint
          : typeof maybeError.code === "string"
            ? `Supabase error code ${maybeError.code}`
            : JSON.stringify(maybeError);
  return {
    message: maybeError.message ?? fallbackMessage ?? null,
    details: maybeError.details ?? null,
    hint: maybeError.hint ?? null,
    code: maybeError.code ?? null,
    status: maybeError.status ?? null,
  };
}

function shouldSilenceSupabaseError(error: SupabaseErrorLike): boolean {
  if (!SUPABASE_CONFIGURED) {
    return true;
  }
  const code = error.code ?? undefined;
  if (code && SUPABASE_OPTIONAL_ERROR_CODES.has(code)) {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  if (
    message.includes("permission denied") ||
    message.includes("invalid jwt")
  ) {
    return true;
  }
  if (message.includes("relation") && message.includes("does not exist")) {
    return true;
  }
  return false;
}

function logSupabaseError(context: string, error: unknown) {
  const normalized = normaliseSupabaseError(error);
  const serialisedContext = `${context}:${normalized.code ?? "unknown"}`;
  if (shouldSilenceSupabaseError(normalized)) {
    if (!silencedSupabaseErrors.has(serialisedContext)) {
      silencedSupabaseErrors.add(serialisedContext);
      logger.info(`${context} (suppressed)`, normalized);
    }
    return;
  }

  const noDetails =
    !normalized.message &&
    !normalized.details &&
    !normalized.hint &&
    !normalized.code;
  const payload = noDetails ? (error ?? null) : normalized;

  if (SUPABASE_OPTIONAL_CONTEXTS.has(context)) {
    if (!silencedSupabaseErrors.has(serialisedContext)) {
      silencedSupabaseErrors.add(serialisedContext);
      logger.info(`${context} (optional)`, payload);
    }
    return;
  }

  if (noDetails) {
    logger.error(`${context}: unknown error`, payload);
    return;
  }

  logger.error(context, payload);
}

async function ensureAuthenticatedClient(): Promise<SupabaseClient | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.info("conversation_supabase_session_error", {
          message: error.message,
          status: error.status,
        });
      }
      return null;
    }
    if (!data?.session) {
      if (process.env.NODE_ENV !== "production") {
        logger.info("conversation_supabase_session_missing");
      }
      return null;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("conversation_supabase_session_throw", error);
    }
    return null;
  }

  return supabase;
}

async function resolveSupabaseUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.info("conversation_supabase_user_error", {
          message: error.message,
          status: error.status,
        });
      }
      return null;
    }
    const userId = data?.user?.id ?? null;
    if (!userId && process.env.NODE_ENV !== "production") {
      logger.info("conversation_supabase_user_missing");
    }
    return userId;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("conversation_supabase_user_throw", error);
    }
    return null;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  title: string,
  model: string,
): Promise<string | null> {
  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return createLocalConversationId();
  }

  const userId = await resolveSupabaseUserId(supabase);
  if (!userId) {
    return createLocalConversationId();
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ title, model, user_id: userId })
    .select("id")
    .single();

  if (error) {
    logSupabaseError("Failed to create conversation", error);
    return createLocalConversationId();
  }

  return data.id;
}

/**
 * Save a message to a conversation
 */
const CLIENT_ID_METADATA_KEY = "clientMessageId";

async function findExistingMessage(
  supabase: SupabaseClient,
  conversationId: string,
  clientMessageId: string,
) {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq(`metadata->>${CLIENT_ID_METADATA_KEY}`, clientMessageId)
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError("Failed to check existing conversation message", error);
    return null;
  }

  return data ?? null;
}

function normaliseMetadata(message: PersistableMessage) {
  return {
    model: message.model,
    strategy: message.strategy,
    query: message.query,
    displayPreferences: message.displayPreferences,
    intentAnalysis: message.intentAnalysis,
    automationPreferences: message.automationPreferences,
    [CLIENT_ID_METADATA_KEY]: message.id,
    role: message.role,
    status: message.status,
  };
}

export async function saveMessage(
  conversationId: string,
  message: PersistableMessage,
  options: { skipDuplicateCheck?: boolean } = {},
): Promise<boolean> {
  if (isLocalConversationId(conversationId)) {
    return saveLocalConversationMessage(conversationId, message);
  }

  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return false;
  }

  const clientMessageId = message.id?.trim();

  if (!options.skipDuplicateCheck && clientMessageId) {
    const existing = await findExistingMessage(
      supabase,
      conversationId,
      clientMessageId,
    );
    if (existing) {
      return true;
    }
  }

  const metadata = normaliseMetadata(message);

  const insertPayload: Record<string, UntypedJson> = {
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
    parts: message.parts || [],
    payloads: message.payloads || null,
    thoughts: message.thoughts || null,
    sources: message.sources || null,
    metadata,
  };

  if (message.createdAt) {
    insertPayload.created_at = message.createdAt;
  }

  const { error } = await supabase
    .from("conversation_messages")
    .insert(insertPayload);

  if (error) {
    logSupabaseError("Failed to save message", error);
    return false;
  }

  return true;
}

export async function saveMessages(
  conversationId: string,
  messages: PersistableMessage[],
  options: { ignoreFailures?: boolean } = {},
): Promise<{ saved: number; attempted: number }> {
  if (isLocalConversationId(conversationId)) {
    const success = saveLocalConversationMessages(conversationId, messages);
    return {
      saved: success ? messages.length : 0,
      attempted: messages.length,
    };
  }

  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return { saved: 0, attempted: 0 };
  }

  let saved = 0;

  for (const message of messages) {
    const success = await saveMessage(conversationId, message, {
      skipDuplicateCheck: false,
    });

    if (success) {
      saved += 1;
    } else if (!options.ignoreFailures) {
      logger.warn("Failed to persist conversation message", {
        conversationId,
        clientMessageId: message.id,
      });
    }
  }

  return {
    saved,
    attempted: messages.length,
  };
}

/**
 * Load conversation messages
 */
export async function loadConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  if (isLocalConversationId(conversationId)) {
    return loadLocalConversationMessages(conversationId);
  }

  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("Failed to load messages", error);
    return [];
  }

  return (data || []).map((row: ConversationMessageRow) => ({
    id: (row.metadata?.[CLIENT_ID_METADATA_KEY] as string) ?? row.id,
    role: row.role as "user" | "assistant",
    content: row.content || "",
    parts: row.parts || [],
    status: "ready" as const,
    thoughts: row.thoughts || [],
    sources: row.sources || [],
    payloads:
      Array.isArray(row.payloads) && row.payloads.length > 0
        ? row.payloads
        : deriveCompatPayloadsFromParts(
            Array.isArray(row.parts) ? row.parts : undefined,
            { includeRightPanelArtifacts: false },
          ),
    model: row.metadata?.model,
    strategy: row.metadata?.strategy,
    query: row.metadata?.query,
    displayPreferences: row.metadata?.displayPreferences,
    intentAnalysis: row.metadata?.intentAnalysis,
    automationPreferences: row.metadata?.automationPreferences ?? undefined,
  }));
}

/**
 * List user's conversations
 */
export async function listConversations(
  limit: number = 50,
  offset: number = 0,
): Promise<Conversation[]> {
  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("conversation_list_skipped_no_session");
    }
    return listLocalConversations(limit, offset);
  }

  const userId = await resolveSupabaseUserId(supabase);
  if (!userId) {
    return listLocalConversations(limit, offset);
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logSupabaseError("Failed to list conversations", error);
    return [];
  }

  return data || [];
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<boolean> {
  if (isLocalConversationId(conversationId)) {
    return updateStoredLocalConversationTitle(conversationId, title);
  }

  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return false;
  }

  const userId = await resolveSupabaseUserId(supabase);
  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("Failed to update conversation title", error);
    return false;
  }

  return true;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string,
): Promise<boolean> {
  if (isLocalConversationId(conversationId)) {
    return deleteLocalConversation(conversationId);
  }

  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return false;
  }

  const userId = await resolveSupabaseUserId(supabase);
  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("Failed to delete conversation", error);
    return false;
  }

  return true;
}

/**
 * Search conversations by title
 */
export async function searchConversations(
  query: string,
  limit: number = 20,
  offset: number = 0,
): Promise<Conversation[]> {
  const supabase = await ensureAuthenticatedClient();
  if (!supabase) {
    return searchLocalConversations(query, limit, offset);
  }

  const userId = await resolveSupabaseUserId(supabase);
  if (!userId) {
    return searchLocalConversations(query, limit, offset);
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logSupabaseError("Failed to search conversations", error);
    return [];
  }

  return data || [];
}

/**
 * Generate conversation title from first message
 */
export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim();
  if (cleaned.length <= 50) {
    return cleaned;
  }
  return cleaned.slice(0, 47) + "...";
}
