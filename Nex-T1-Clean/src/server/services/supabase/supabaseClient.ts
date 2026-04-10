import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { createClient as createServerClient } from "@/server/services/supabase/server";

type SupabaseServerClientOptions = {
  /**
   * When provided, PostgREST calls will be executed with this user JWT.
   * This is required for header-only auth clients (e.g., extensions) so RLS
   * is evaluated in the correct user context.
   */
  accessToken?: string | null;
};

export async function getSupabaseServerClient(options: SupabaseServerClientOptions = {}) {
  const token = typeof options.accessToken === "string" ? options.accessToken.trim() : "";
  if (token) {
    const config = getSupabaseConfig();
    if (!config) return null;

    return createSupabaseClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  return createServerClient();
}

export function getSupabaseAdminClient() {
  try {
    return createServiceRoleClient();
  } catch {
    // Preserve previous nullable semantics for legacy callers.
    return null;
  }
}
