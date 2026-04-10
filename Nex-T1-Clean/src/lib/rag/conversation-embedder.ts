/**
 * Conversation Embedder
 * Automatically embeds important chat messages for future RAG retrieval
 */

import type { SupabaseServerClient } from "@/server/services/supabase/server";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";
import { openai } from "@/server/services/ai-sdk/openai";


import { logger } from '@/lib/logger';
/**
 * Embed a single conversation turn (user + assistant messages)
 */
type SupabaseDatabaseClient = SupabaseServerClient | SupabaseServiceRoleClient;

export async function embedConversationTurn(
  supabase: SupabaseDatabaseClient,
  userId: string,
  conversationId: string | null,
  userMessage: string,
  assistantMessage: string,
  metadata?: Record<string, UntypedJson>,
): Promise<void> {
  // Only embed substantial exchanges
  if (userMessage.length < 50 || assistantMessage.length < 50) {
    return;
  }

  // Skip commands
  if (userMessage.startsWith("/")) {
    return;
  }

  // Skip error messages
  if (assistantMessage.includes("I'm sorry") || assistantMessage.includes("error")) {
    return;
  }

  try {
    // Generate embeddings for both messages
    const embeddingModel = openai.embedding("text-embedding-ada-002");
    const { embeddings } = await embeddingModel.doEmbed({
      values: [userMessage, assistantMessage],
    });

    // Store both with their embeddings
    const { error } = await supabase.from("conversation_history_embeddings").insert([
      {
        user_id: userId,
        conversation_id: conversationId,
        message_content: userMessage,
        message_role: "user",
        embedding: embeddings[0] as UntypedJson as string,
        metadata: metadata || {},
      },
      {
        user_id: userId,
        conversation_id: conversationId,
        message_content: assistantMessage,
        message_role: "assistant",
        embedding: embeddings[1] as UntypedJson as string,
        metadata: metadata || {},
      },
    ]);

    if (error) {
      logger.error("[Conversation Embedder] Error storing embeddings:", error);
    } else {
      logger.debug("[Conversation Embedder] Embedded conversation turn");
    }
  } catch (error) {
    logger.error("[Conversation Embedder] Error:", error);
  }
}

/**
 * Batch embed multiple conversation turns (for background processing)
 */
export async function batchEmbedConversations(
  supabase: SupabaseServerClient,
  conversations: Array<{
    userId: string;
    conversationId: string | null;
    userMessage: string;
    assistantMessage: string;
    metadata?: Record<string, UntypedJson>;
  }>,
): Promise<number> {
  let embedded = 0;

  for (const conv of conversations) {
    try {
      await embedConversationTurn(
        supabase,
        conv.userId,
        conv.conversationId,
        conv.userMessage,
        conv.assistantMessage,
        conv.metadata,
      );
      embedded++;
    } catch (error) {
      logger.error("[Batch Embedder] Failed to embed conversation:", error);
    }
  }

  return embedded;
}
