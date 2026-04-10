import { connection } from "next/server";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";

import {
  clearActiveChatStreamId,
  getActiveChatStreamId,
} from "@/server/chat/active-stream-store";
import { getChatResumableStreamContext } from "@/server/chat/resumable-stream-context";
import { withAuth } from "@/server/security/with-auth";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { isLocalConversationId } from "@/modules/chat/persistence/local-conversation-id";

import { logger } from "@/lib/logger";

export const maxDuration = 120;

export async function GET(
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
    logger.error("[chat resume] failed to verify conversation ownership", error);
    return new Response(null, { status: 500 });
  }

  if (!conversation?.id) {
    return new Response(null, { status: 404 });
  }

  const activeStreamId = await getActiveChatStreamId(conversationId);
  if (!activeStreamId) {
    return new Response(null, { status: 204 });
  }

  let stream: ReadableStream<string> | null | undefined = null;
  try {
    stream = await getChatResumableStreamContext().resumeExistingStream(
      activeStreamId,
    );
  } catch (error) {
    logger.error("[chat resume] failed to resume existing stream", error);
    await clearActiveChatStreamId(conversationId, activeStreamId);
    return new Response(null, { status: 204 });
  }

  if (!stream) {
    await clearActiveChatStreamId(conversationId, activeStreamId);
    return new Response(null, { status: 204 });
  }

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}
