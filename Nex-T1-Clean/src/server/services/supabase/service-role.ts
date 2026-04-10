import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";

type ServiceRoleConfig = {
  url: string;
  serviceKey: string;
};

let cachedClient: SupabaseClient | null = null;
let cachedSignature: string | null = null;

function getServiceRoleConfig(): ServiceRoleConfig {
  const baseConfig = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error("Service-role Supabase client must not be used in edge runtime");
  }

  if (!baseConfig || !serviceKey) {
    throw new Error(
      "Supabase service role configuration missing. Set SUPABASE_* env vars and SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }

  return {
    url: baseConfig.url,
    serviceKey,
  };
}

export function createServiceRoleClient(): SupabaseClient {
  const config = getServiceRoleConfig();
  const signature = `${config.url}|${config.serviceKey}`;

  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });
  cachedSignature = signature;

  return cachedClient;
}

export type SupabaseServiceRoleClient = ReturnType<typeof createServiceRoleClient>;
