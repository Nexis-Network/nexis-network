import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getWalletHistoryAggregate } from "@/server/settings/wallet-aggregator";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { fetchConversationSummaries } from "@/server/chat/conversation-store";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { paginateList } from "@/lib/pagination";

import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("settings.wallets.history.GET", async () => {
    const url = new URL(request.url);
    const cursor = Number(url.searchParams.get("cursor") ?? "0") || 0;
    const limit = Math.min(
      100,
      Math.max(10, Number(url.searchParams.get("limit") ?? "25") || 25),
    );
    const includeConversations =
      (url.searchParams.get("includeConversations") ?? "").toLowerCase() ===
      "1";
    const conversationLimit = Math.min(
      100,
      Math.max(
        5,
        Number(url.searchParams.get("conversationLimit") ?? "25") || 25,
      ),
    );
    const conversationSearch =
      url.searchParams.get("conversationSearch")?.trim() ?? null;

    const jar = await cookies();
    const bridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(bridge, {
      refreshSession: false,
      request,
    });

    if (!context?.userId) {
      return bridge.commit(apiResponse.unauthorized());
    }

    const aggregate = await getWalletHistoryAggregate(String(context.userId));
    const page = paginateList(aggregate.events, cursor, limit);

    let conversations: Awaited<
      ReturnType<typeof fetchConversationSummaries>
    >["conversations"] = [];
    if (includeConversations) {
      try {
        const supabase = await createSupabaseServerClient();
        if (supabase) {
          const page = await fetchConversationSummaries(
            supabase,
            context.userId,
            {
              limit: conversationLimit,
              search: conversationSearch,
            },
          );
          conversations = page.conversations;
        }
      } catch (error) {
        logger.error("wallet_history_conversation_fetch_failed", error);
      }
    }

    const response = apiResponse.success({
      generatedAt: aggregate.generatedAt,
      events: page.items,
      nextCursor: page.nextCursor,
      conversations,
      conversationGeneratedAt: new Date().toISOString(),
    });
    response.headers.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=600",
    );
    return bridge.commit(response);
  });
}
