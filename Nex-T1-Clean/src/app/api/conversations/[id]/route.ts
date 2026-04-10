import { cookies } from "next/headers";
import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { fetchConversationMessages } from "@/server/chat/conversation-store";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { conversationIdParamsSchema } from "@/server/api/validators/conversations";


// Use distinct type for context to avoid Any
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  await connection();
  const parsedParams = conversationIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiResponse.validationError(parsedParams.error);
  }
  const { id } = parsedParams.data;

  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });
    if (!context?.userId) {
      return bridge.commit(apiResponse.unauthorized("unauthorized"));
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return bridge.commit(apiResponse.internalError("Database connection failed"));
    }

    const messages = await fetchConversationMessages(supabase, id, context.userId);

    return bridge.commit(
      apiResponse.success({
        messages,
        generatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    return bridge.commit(
      apiResponse.internalError(
        error instanceof Error ? error.message : "Unknown error"
      )
    );
  }
}
