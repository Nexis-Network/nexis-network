"use client";

import { createBrowserClient, type SupabaseBrowserClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/config";


import { logger } from '@/lib/logger';
let supabaseConfigWarningLogged = false;

export function getSupabaseBrowserClient(): SupabaseBrowserClient | null {
  try {
    return createBrowserClient();
  } catch (error) {
    if (!supabaseConfigWarningLogged) {
      supabaseConfigWarningLogged = true;
      const message =
        error instanceof Error ? error.message : "Supabase browser client initialisation failed";
      const payload = error instanceof Error ? error : new Error(String(error));

      if (process.env.NODE_ENV !== "production") {
        logger.warn("supabase_browser_client_unconfigured", { message, error: payload });
      }
    }

    return null;
  }
}

export { isSupabaseConfigured };
