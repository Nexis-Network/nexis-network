import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertSupabaseConfig } from "@/lib/supabase/config";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
let anonClient: SupabaseClient | null = null;

function getUrlAndKeys() {
  const { url, anonKey } = assertSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in the environment for server-side wallet auth.");
  }

  return { url, anonKey, serviceRoleKey };
}

/**
 * Get diagnostic info about Supabase connection for debugging.
 * Safe to log (no secrets).
 */
export function getSupabaseConnectionInfo(): {
  url: string;
  isRailwayPrivate: boolean;
  isConfigured: boolean;
} {
  try {
    const { url } = getUrlAndKeys();
    const isRailwayPrivate = url.includes('.railway.internal');
    return { url, isRailwayPrivate, isConfigured: true };
  } catch {
    return { url: 'not configured', isRailwayPrivate: false, isConfigured: false };
  }
}

export function getSupabaseAdminClient() {
  // Canonical service-role client implementation lives in service-role.ts.
  return createServiceRoleClient();
}

export function getSupabaseServerAnonClient() {
  if (anonClient) {
    return anonClient;
  }

  const { url, anonKey } = getUrlAndKeys();
  anonClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return anonClient;
}

export function getSupabaseServiceRoleKey() {
  const { serviceRoleKey } = getUrlAndKeys();
  return serviceRoleKey;
}
