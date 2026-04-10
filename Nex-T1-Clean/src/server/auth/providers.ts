import { getErrorMessage } from "@/lib/utils/error";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  normalizeSupabaseProviderId,
  type ProviderConfigEntry,
  resolveEnabledProviderMap,
} from "@/lib/supabase/providers";

import { logger } from "@/lib/logger";

type CachedProviders = {
  timestamp: number;
  providers: ProviderConfigEntry[];
};

let cache: CachedProviders | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function shouldUseCache(candidate: CachedProviders | null): candidate is CachedProviders {
  if (!candidate) return false;
  return Date.now() - candidate.timestamp < CACHE_TTL_MS;
}

function buildFallback(): ProviderConfigEntry[] {
  const resolved = resolveEnabledProviderMap();
  return Array.from(resolved.entries()).map(([provider]) => ({
    provider,
    enabled: true,
  }));
}

function coerceEnabled(value: UntypedJson): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function normalizeExternalProviders(payload: UntypedJson): ProviderConfigEntry[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const settings = (payload as Record<string, UntypedJson>).settings;
  const root = settings && typeof settings === "object" ? settings : payload;
  const external =
    root && typeof root === "object" && "external" in root && typeof (root as Record<string, UntypedJson>).external === "object"
      ? ((root as Record<string, UntypedJson>).external as Record<string, UntypedJson>)
      : {};

  const entries: ProviderConfigEntry[] = [];
  for (const [rawKey, rawValue] of Object.entries(external)) {
    if (!rawKey || typeof rawKey !== "string") {
      continue;
    }
    const normalizedKey = normalizeSupabaseProviderId(rawKey);
    if (!normalizedKey) {
      continue;
    }

    if (typeof rawValue === "boolean") {
      entries.push({ provider: normalizedKey, enabled: rawValue });
      continue;
    }

    if (!rawValue || typeof rawValue !== "object") {
      entries.push({ provider: normalizedKey, enabled: true });
      continue;
    }

    const record = rawValue as Record<string, UntypedJson>;
    const enabled = coerceEnabled(record.enabled) ?? (typeof record.client_id === "string" && record.client_id.trim().length > 0);

    entries.push({
      provider: normalizedKey,
      enabled,
    });
  }

  return entries;
}

export async function loadSupabaseOAuthProviders(options: { bypassCache?: boolean } = {}): Promise<ProviderConfigEntry[]> {
  const { bypassCache = false } = options;

  if (!bypassCache && shouldUseCache(cache)) {
    return cache.providers;
  }

  const config = getSupabaseConfig();

  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("supabase_provider_settings_missing_env", {
        hasConfig: Boolean(config),
      });
    }
    const providers = buildFallback();
    cache = { timestamp: Date.now(), providers };
    return providers;
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      method: "GET",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Supabase settings returned ${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));
    const providers = normalizeExternalProviders(payload);

    if (providers.length === 0) {
      const fallback = buildFallback();
      cache = { timestamp: Date.now(), providers: fallback };
      return fallback;
    }

    cache = { timestamp: Date.now(), providers };
    return providers;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("supabase_provider_settings_fetch_failed", {
        error: getErrorMessage(error, "failed to load provider settings"),
      });
    }
    const providers = buildFallback();
    cache = { timestamp: Date.now(), providers };
    return providers;
  }
}

export function __resetProviderCacheForTests() {
  cache = null;
}
