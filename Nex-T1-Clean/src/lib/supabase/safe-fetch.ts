import { logger } from '@/lib/logger';

"use client";

let hasLoggedWarning = false;

function logFetchWarning(error: UntypedJson) {
  if (process.env.NODE_ENV === "production" || hasLoggedWarning) {
    return;
  }
  hasLoggedWarning = true;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown fetch failure";
  logger.warn("supabase_fetch_network_error", { message, error });
}

export function createSafeSupabaseFetch(): typeof fetch {
  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch) {
    throw new Error("Global fetch implementation is required to create the Supabase client");
  }

  return async (...args) => {
    try {
      return await nativeFetch(...args);
    } catch (error) {
      logFetchWarning(error);
      const body = JSON.stringify({
        error: "network_error",
        message: error instanceof Error ? error.message : String(error),
      });
      return new Response(body, {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-Supabase-Network-Error": "1",
        },
      });
    }
  };
}
