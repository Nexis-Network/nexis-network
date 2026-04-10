const SUPPORTED_PROVIDER_IDS = [
  "google",
  "github",
  "x",
  "discord",
  "apple",
] as const;

export type SupabaseOAuthProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];

const PROVIDER_ALIAS_MAP: Record<string, SupabaseOAuthProviderId> = {
  google: "google",
  "google_oauth": "google",
  "google_oidc": "google",
  "google-oauth2": "google",
  "accounts.google.com": "google",
  github: "github",
  "github_oauth": "github",
  "github_oidc": "github",
  "github-beta": "github",
  twitter: "x",
  "twitter_oauth": "x",
  "twitter_oidc": "x",
  x: "x",
  "x_oauth": "x",
  "x.com": "x",
  "x-twitter": "x",
  discord: "discord",
  "discord_oauth": "discord",
  "discord_oidc": "discord",
  apple: "apple",
  "apple_oauth": "apple",
  "apple_oidc": "apple",
};

function isSupportedProviderId(value: string): value is SupabaseOAuthProviderId {
  return (SUPPORTED_PROVIDER_IDS as readonly string[]).includes(value);
}

export function normalizeSupabaseProviderId(raw: UntypedJson): SupabaseOAuthProviderId | null {
  if (typeof raw !== "string") {
    return null;
  }
  const candidate = raw.trim().toLowerCase();
  if (!candidate) {
    return null;
  }
  const aliased = PROVIDER_ALIAS_MAP[candidate];
  if (aliased) {
    return aliased;
  }
  return isSupportedProviderId(candidate) ? candidate : null;
}

export type ProviderConfigEntry = {
  provider?: string;
  enabled?: boolean;
};

export function extractProviderConfigEntries(
  payload: UntypedJson,
): ProviderConfigEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: ProviderConfigEntry[] }).data;
  }

  return [];
}

export function buildProviderMap(
  entries: ProviderConfigEntry[] | undefined | null,
): Map<SupabaseOAuthProviderId, string> {
  const map = new Map<SupabaseOAuthProviderId, string>();
  if (!Array.isArray(entries)) {
    return map;
  }

  for (const entry of entries) {
    if (entry && entry.enabled === false) {
      continue;
    }
    const canonical = normalizeSupabaseProviderId(entry?.provider);
    if (!canonical) {
      continue;
    }
    const raw =
      typeof entry?.provider === "string" && entry.provider.trim().length > 0
        ? entry.provider.trim().toLowerCase()
        : canonical;
    map.set(canonical, raw);
  }

  return map;
}

export function mergeProviderMaps(
  fallback: Map<SupabaseOAuthProviderId, string>,
  resolved: Map<SupabaseOAuthProviderId, string>,
): Map<SupabaseOAuthProviderId, string> {
  const merged = new Map(fallback);
  for (const [provider, slug] of resolved.entries()) {
    merged.set(provider, slug);
  }
  return merged;
}

type ProviderEnvEntry = {
  canonical: SupabaseOAuthProviderId;
  slug: string;
};

function parseEnabledProviderEnv(): ProviderEnvEntry[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ENABLED_PROVIDERS;
  if (!raw) {
    return [];
  }

  const entries = raw
    .split(/[,\s]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const resolved: ProviderEnvEntry[] = [];
  for (const entry of entries) {
    const canonical = normalizeSupabaseProviderId(entry);
    if (!canonical) {
      continue;
    }
    const slug = entry.toLowerCase();
    if (resolved.some((existing) => existing.canonical === canonical)) {
      continue;
    }
    resolved.push({ canonical, slug: slug.length > 0 ? slug : canonical });
  }

  return resolved;
}

export function resolveEnabledProviderMap(): Map<SupabaseOAuthProviderId, string> {
  const fallback = createFallbackProviderMap();
  const enabled = parseEnabledProviderEnv();

  if (!enabled.length) {
    return fallback;
  }

  const map = new Map<SupabaseOAuthProviderId, string>();
  for (const { canonical, slug } of enabled) {
    const fallbackSlug = fallback.get(canonical) ?? canonical;
    map.set(canonical, slug || fallbackSlug);
  }

  return map.size > 0 ? map : fallback;
}

export const SUPPORTED_SUPABASE_PROVIDER_IDS: readonly SupabaseOAuthProviderId[] =
  SUPPORTED_PROVIDER_IDS;

export function createSafeProviderFallbackMap(): Map<SupabaseOAuthProviderId, string> {
  return resolveEnabledProviderMap();
}

export function createFallbackProviderMap(): Map<SupabaseOAuthProviderId, string> {
  return new Map<SupabaseOAuthProviderId, string>(
    SUPPORTED_PROVIDER_IDS.map((id) => [id, id]),
  );
}
