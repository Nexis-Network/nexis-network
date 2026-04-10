import { connection } from "next/server";

import {
  clearActiveChatStreamId,
  getActiveChatStreamId,
} from "@/server/chat/active-stream-store";
import { cancelChatExecution } from "@/server/chat/execution-cancellation";
import { isLocalConversationId } from "@/modules/chat/persistence/local-conversation-id";
import { withAuth } from "@/server/security/with-auth";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();

  const auth = await withAuth(request, { requireOrg: false, allowPublic: false });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const conversationId = typeof id === "string" ? id.trim() : "";
  if (!conversationId) {
    return new Response(null, { status: 400 });
  }
  if (isLocalConversationId(conversationId)) {
    return new Response(null, { status: 404 });
  }

  const userId = auth.session?.user.id ?? null;
  if (!userId) {
    return new Response(null, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return new Response(null, { status: 503 });
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("[chat cancel] failed to verify conversation ownership", error);
    return new Response(null, { status: 500 });
  }

  if (!conversation?.id) {
    return new Response(null, { status: 404 });
  }

  const activeStreamId = await getActiveChatStreamId(conversationId);
  if (!activeStreamId) {
    return new Response(null, { status: 204 });
  }

  const wasCancelled = await cancelChatExecution(activeStreamId);
  if (!wasCancelled) {
    logger.warn("[chat cancel] cancellation marker was not persisted", {
      conversationId,
      activeStreamId,
      userId,
    });
    return new Response(null, { status: 503 });
  }

  await clearActiveChatStreamId(conversationId, activeStreamId);

  return new Response(null, { status: 202 });
}
