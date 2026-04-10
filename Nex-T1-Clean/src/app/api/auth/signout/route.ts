import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { type NextRequest } from "next/server";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE, getSupabaseAuthStorageKey } from "@/server/auth/auth-context";
import { SUPABASE_SESSION_REFRESH_CACHE_COOKIE } from "@/lib/middleware/session-refresh";
import { createClient } from "@/server/services/supabase/server";

export async function POST(_request: NextRequest) {
  return timeApiRoute("auth.signout.POST", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);

    const supabase = await createClient();
    if (!supabase) {
      stageSignOutCookies(cookieBridge);
      return cookieBridge.commit(apiResponse.success({ ok: true, note: "Supabase not configured" }));
    }

    const { error } = await supabase.auth.signOut();
    stageSignOutCookies(cookieBridge);
    if (error) {
      return cookieBridge.commit(apiResponse.error("SIGNOUT_FAILED", error.message, 500));
    }

    return cookieBridge.commit(apiResponse.success({ ok: true }));
  });
}

function stageSignOutCookies(cookieBridge: ReturnType<typeof createCookieBridge>) {
  const storageKey = getSupabaseAuthStorageKey();
  const deletions = [
    { name: SUPABASE_ACCESS_COOKIE, value: "" },
    { name: SUPABASE_REFRESH_COOKIE, value: "" },
    { name: SUPABASE_SESSION_REFRESH_CACHE_COOKIE, value: "" },
    ...(storageKey ? [{ name: storageKey, value: "" }] : []),
    // Storage chunked cookies sb-<project>-auth-token.0..4
    ...(storageKey
      ? Array.from({ length: 5 }).map((_, idx) => ({ name: `${storageKey}.${idx}`, value: "" }))
      : []),
  ];

  cookieBridge.setAll(
    deletions.map(({ name, value }) => ({
      name,
      value,
      options: {
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      },
    })),
  );
}
