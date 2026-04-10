import { logger } from '@/lib/logger';

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type EnvEntry = {
  key: string;
  value: string | undefined;
};

const PUBLIC_URL_ENTRY = {
  key: "NEXT_PUBLIC_SUPABASE_URL",
  value: process.env.NEXT_PUBLIC_SUPABASE_URL,
} as const satisfies EnvEntry;

const PUBLIC_PROJECT_URL_ENTRY = {
  key: "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  value: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
} as const satisfies EnvEntry;

const PRIVATE_URL_ENTRY = {
  key: "SUPABASE_URL",
  value: process.env.SUPABASE_URL,
} as const satisfies EnvEntry;

const PRIVATE_PROJECT_URL_ENTRY = {
  key: "SUPABASE_PROJECT_URL",
  value: process.env.SUPABASE_PROJECT_URL,
} as const satisfies EnvEntry;

// Auth endpoints require the anon (JWT) key. Publishable keys are a fallback
// for legacy environments but should not be preferred.
const ANON_KEY_ENV_ENTRIES = [
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
  { key: "SUPABASE_ANON_KEY", value: process.env.SUPABASE_ANON_KEY },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY },
  { key: "SUPABASE_PUBLISHABLE_OR_ANON_KEY", value: process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY },
  { key: "SUPABASE_PUBLISHABLE_KEY", value: process.env.SUPABASE_PUBLISHABLE_KEY },
] as const satisfies readonly EnvEntry[];

const SUPABASE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_PROJECT_URL",
  "SUPABASE_URL",
] as const;

let warnedAboutFallback = false;
let validatedSupabaseProjectRefs = false;

function normalize(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const RAILWAY_INTERNAL_SUFFIX = ".railway.internal";

function isRailwayInternalHost(hostname: string | null | undefined): boolean {
  return Boolean(hostname && hostname.endsWith(RAILWAY_INTERNAL_SUFFIX));
}

function isAuthSubdomainHost(value: string): boolean {
  try {
    const candidate =
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`;
    const { hostname } = new URL(candidate);
    return hostname.toLowerCase().startsWith("auth.");
  } catch {
    return false;
  }
}

function extractSupabaseProjectRef(value: string | undefined): string | null {
  const normalized = normalize(value);
  if (!normalized) return null;
  try {
    const withScheme =
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalized}`;
    const host = new URL(withScheme).hostname;
    if (host.startsWith("auth.")) {
      return null;
    }
    if (isRailwayInternalHost(host)) {
      return null;
    }
    const [projectRef] = host.split(".");
    return projectRef && projectRef.length > 0 ? projectRef : null;
  } catch {
    return null;
  }
}

function validateSupabaseProjectRefConsistency() {
  if (validatedSupabaseProjectRefs) {
    return;
  }
  validatedSupabaseProjectRefs = true;

  const refMap = new Map<string, string[]>();
  for (const key of SUPABASE_URL_ENV_KEYS) {
    const ref = extractSupabaseProjectRef(process.env[key]);
    if (!ref) continue;
    const entries = refMap.get(ref) ?? [];
    entries.push(key);
    refMap.set(ref, entries);
  }

  if (refMap.size <= 1) {
    return;
  }

  const summary = Array.from(refMap.entries())
    .map(([ref, keys]) => `${ref} ← ${keys.join(", ")}`)
    .join(" | ");
  const message =
    "Supabase URL envs resolve to different project refs. " +
    "Align NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL (and SUPABASE_PROJECT_URL if set) to the same project origin " +
    `to avoid auth cookie mismatches. (${summary})`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }

  logger.warn(message);
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const normalized = url.origin;

    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (normalizedPath && normalizedPath !== "") {
      // Supabase URL must be an origin (no path). A common mistake is to paste
      // the OAuth callback (…/auth/v1/callback) here.
      if (process.env.NODE_ENV !== "production") {
        logger.warn(
          `Supabase URL should not include a path. Normalizing ${value} → ${normalized}`,
        );
      }
    }

    return normalized;
  } catch {
    return null;
  }
}

function resolveEnvValue(
  entries: readonly EnvEntry[],
  options?: { preferApiCapableUrl?: boolean },
) {
  const candidates: Array<{ key: string; value: string }> = [];
  for (const entry of entries) {
    const value = normalize(entry.value);
    if (value) {
      candidates.push({ key: entry.key, value });
    }
  }
  if (candidates.length === 0) {
    return null;
  }

  if (options?.preferApiCapableUrl) {
    const apiCapableCandidate = candidates.find(
      (candidate) => !isAuthSubdomainHost(candidate.value),
    );
    if (apiCapableCandidate) {
      return apiCapableCandidate;
    }
  }

  return candidates[0];
}

function preferPrivateSupabaseUrl(): boolean {
  // Prefer the server-only SUPABASE_URL when it is available. In browser builds,
  // SUPABASE_URL is not exposed, so this falls back to NEXT_PUBLIC_SUPABASE_URL.
  return Boolean(normalize(PRIVATE_URL_ENTRY.value) || normalize(PRIVATE_PROJECT_URL_ENTRY.value));
}

function getUrlEnvEntries(): readonly EnvEntry[] {
  return preferPrivateSupabaseUrl()
    ? [PRIVATE_URL_ENTRY, PRIVATE_PROJECT_URL_ENTRY, PUBLIC_PROJECT_URL_ENTRY, PUBLIC_URL_ENTRY]
    : [PUBLIC_URL_ENTRY, PUBLIC_PROJECT_URL_ENTRY, PRIVATE_URL_ENTRY, PRIVATE_PROJECT_URL_ENTRY];
}

export function getSupabaseConfig(): SupabaseConfig | null {
  validateSupabaseProjectRefConsistency();
  const urlEntries = getUrlEnvEntries();
  const resolvedUrl = resolveEnvValue(urlEntries, { preferApiCapableUrl: true });
  const resolvedAnon = resolveEnvValue(ANON_KEY_ENV_ENTRIES);

  if (!resolvedUrl || !resolvedAnon) {
    return null;
  }

  if (!isAbsoluteHttpUrl(resolvedUrl.value)) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(
        `Supabase URL is invalid or missing scheme (expected http/https): ${resolvedUrl.value}. Set NEXT_PUBLIC_SUPABASE_URL to a full URL like https://xyz.supabase.co`,
      );
    }
    return null;
  }

  const normalizedUrl = normalizeSupabaseUrl(resolvedUrl.value);
  if (!normalizedUrl) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(
        `Supabase URL is invalid (expected origin like https://xyz.supabase.co): ${resolvedUrl.value}`,
      );
    }
    return null;
  }

  if (
    !warnedAboutFallback &&
    (resolvedUrl.key !== urlEntries[0].key || resolvedAnon.key !== ANON_KEY_ENV_ENTRIES[0].key) &&
    process.env.NODE_ENV !== "production"
  ) {
    warnedAboutFallback = true;
    logger.warn(
      "Supabase config is using fallback environment variables (preferred: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }

  // Debug logging for dev environment to help diagnose connection issues
  if (process.env.NODE_ENV !== "production" && !warnedAboutFallback) {
    // Use a static flag to only log this once per process to avoid spam
    if (!(globalThis as Record<string, UntypedJson>)._supabase_debug_logged) {
      logger.debug(`[Supabase Config] URL: ${normalizedUrl}`);
      (globalThis as Record<string, UntypedJson>)._supabase_debug_logged = true;
    }
  }

  return {
    url: normalizedUrl,
    anonKey: resolvedAnon.value,
  } satisfies SupabaseConfig;
}

export function getPublicSupabaseConfig(): SupabaseConfig | null {
  validateSupabaseProjectRefConsistency();
  const resolvedUrl = resolveEnvValue(
    [PUBLIC_URL_ENTRY, PUBLIC_PROJECT_URL_ENTRY],
    { preferApiCapableUrl: true },
  );
  const resolvedAnon = resolveEnvValue(ANON_KEY_ENV_ENTRIES);

  if (!resolvedUrl || !resolvedAnon) {
    return null;
  }

  if (!isAbsoluteHttpUrl(resolvedUrl.value)) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(
        `Supabase URL is invalid or missing scheme (expected http/https): ${resolvedUrl.value}. Set NEXT_PUBLIC_SUPABASE_URL to a full URL like https://xyz.supabase.co`,
      );
    }
    return null;
  }

  const normalizedUrl = normalizeSupabaseUrl(resolvedUrl.value);
  if (!normalizedUrl) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn(
        `Supabase URL is invalid (expected origin like https://xyz.supabase.co): ${resolvedUrl.value}`,
      );
    }
    return null;
  }

  return {
    url: normalizedUrl,
    anonKey: resolvedAnon.value,
  } satisfies SupabaseConfig;
}

export function assertSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase environment is not configured correctly");
  }
  return config;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
