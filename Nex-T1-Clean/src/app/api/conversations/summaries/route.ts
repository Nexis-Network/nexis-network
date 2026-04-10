import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { isNonProductionTestMode } from "@/server/auth/test-mode";
import { fetchConversationSummaries } from "@/server/chat/conversation-store";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { conversationSummariesQuerySchema } from "@/server/api/validators/conversations";

function emptyConversationSummariesResponse() {
  return apiResponse.success({
    conversations: [],
    hasMore: false,
    nextOffset: null,
    generatedAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const parsedQuery = conversationSummariesQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
  if (!parsedQuery.success) {
    return apiResponse.validationError(parsedQuery.error);
  }
  const { limit, offset, search } = parsedQuery.data;

  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const testMode = isNonProductionTestMode({ cookies: jar, request });

  try {
    const { context } = await resolveSupabaseContext(bridge, {
      refreshSession: false,
      request,
    });
    if (!context?.userId) {
      if (testMode) {
        return bridge.commit(emptyConversationSummariesResponse());
      }
      return bridge.commit(apiResponse.unauthorized("unauthorized"));
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return bridge.commit(emptyConversationSummariesResponse());
    }

    const conversations = await fetchConversationSummaries(
      supabase,
      context.userId,
      {
        limit,
        offset,
        search,
      },
    );

    const response = apiResponse.success({
      conversations: conversations.conversations,
      hasMore: conversations.hasMore,
      nextOffset: conversations.nextOffset,
      generatedAt: new Date().toISOString(),
    });
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=300",
    );

    return bridge.commit(response);
  } catch (error) {
    return bridge.commit(
      apiResponse.error(
        "FETCH_FAILED",
        error instanceof Error ? error.message : String(error ?? "unknown"),
        502,
      ),
    );
  }
}
