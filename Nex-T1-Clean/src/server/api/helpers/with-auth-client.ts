import { cookies } from "next/headers";
import { apiResponse } from "@/lib/api-platform";
import { getErrorMessage } from "@/lib/utils/error";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext, type SupabaseAuthContext } from "@/server/auth/auth-context";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";

type HandlerCtx = {
  userId: string;
  cookieBridge: ReturnType<typeof createCookieBridge>;
  // Non-null because withAuthedSupabase returns 503 if supabase is null
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  // Full auth context with roles, claims, etc.
  context: SupabaseAuthContext;
};

type Handler = (ctx: HandlerCtx) => Promise<Response>;

export async function withAuthedSupabase(handler: Handler): Promise<Response> {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase configuration missing"));
    }

    return await handler({ userId: context.userId, cookieBridge, supabase, context });
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.internalError(getErrorMessage(error, "Unexpected server error")),
    );
  }
}
