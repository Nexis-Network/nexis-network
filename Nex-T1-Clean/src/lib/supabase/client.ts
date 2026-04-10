import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseAuthStorageKey } from "@/server/auth/token-utils";


import { logger } from '@/lib/logger';
let cachedClient: ReturnType<typeof createBrowserClient> | null | undefined;
let cachedSignature: string | null = null;

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Supabase browser client requested but environment variables are missing");
    }
    throw new Error("Supabase is not configured");
  }

  const signature = `${config.url}|${config.anonKey}`;
  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  const storageKey = getSupabaseAuthStorageKey();

  cachedClient = createBrowserClient(config.url, config.anonKey, {
    cookieOptions: {
      name: storageKey ?? undefined,
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
      detectSessionInUrl: true,
    },
  });
  cachedSignature = signature;

  return cachedClient;
}

export type SupabaseBrowserClient = NonNullable<ReturnType<typeof createBrowserClient>>;
