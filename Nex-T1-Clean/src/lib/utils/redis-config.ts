import { logger } from '@/lib/logger';

export type SerializableRedisValue = string | number | boolean | Record<string, UntypedJson> | Array<UntypedJson> | null;

export function sanitizeEnv(value?: string | null): string | null {
  const sanitized = value?.replace(/^['"]|['"]$/g, "");
  return sanitized || null;
}

export function serializeRedisValue(value: UntypedJson): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function deserializeRedisValue(value: string): UntypedJson {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export type RedisOptions = {
  family?: number;
  tls?: Record<string, UntypedJson>;
  maxRetriesPerRequest?: number | null;
  connectTimeout?: number;
  keepAlive?: number;
};

export type StandardRedisConfig = {
  url: string;
  token: string;
};

export function resolveStandardRedisConfig(): StandardRedisConfig | null {
  const url =
    sanitizeEnv(process.env.UPSTASH_REDIS_REST_URL) ??
    sanitizeEnv(process.env.NEX_STORAGE_KV_REST_API_URL);

  const token =
    sanitizeEnv(process.env.UPSTASH_REDIS_REST_TOKEN) ??
    sanitizeEnv(process.env.NEX_STORAGE_KV_REST_API_TOKEN);

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function buildRedisConnectionStringFromDiscreteEnv(): string | null {
  const host =
    sanitizeEnv(process.env.REDIS_HOST) ??
    sanitizeEnv(process.env.REDISHOST);
  const port =
    sanitizeEnv(process.env.REDIS_PORT) ??
    sanitizeEnv(process.env.REDISPORT);
  const password =
    sanitizeEnv(process.env.REDIS_PASSWORD) ??
    sanitizeEnv(process.env.REDISPASSWORD) ??
    sanitizeEnv(process.env.NEX_REDIS_PASSWORD);
  const username =
    sanitizeEnv(process.env.REDIS_USER) ??
    sanitizeEnv(process.env.REDISUSER) ??
    "default";
  const scheme =
    sanitizeEnv(process.env.REDIS_SCHEME) ??
    "redis";

  if (!host || !port) {
    return null;
  }

  try {
    const url = new URL(`${scheme}://redis.local`);
    url.hostname = host;
    url.port = port;
    url.username = username;
    if (password) {
      url.password = password;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveRedisConnectionString(): string | null {
  return (
    sanitizeEnv(process.env.NEX_REDIS_URL) ??
    sanitizeEnv(process.env.SHARED_CACHE_URL) ??
    sanitizeEnv(process.env.REDIS_URL) ??
    sanitizeEnv(process.env.RAILWAY_REDIS_URL) ??
    sanitizeEnv(process.env.REDIS_TLS_URL) ??
    sanitizeEnv(process.env.NEX_STORAGE_REDIS_URL) ??
    sanitizeEnv(process.env.NEX_STORAGE_KV_URL) ??
    buildRedisConnectionStringFromDiscreteEnv()
  );
}

export function shouldSkipExternalRedisConnections(): boolean {
  const explicit = sanitizeEnv(process.env.NEX_SKIP_EXTERNAL_REDIS)?.toLowerCase();

  if (explicit) {
    return ["1", "true", "yes", "on"].includes(explicit);
  }

  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.npm_lifecycle_script?.includes("next build") === true
  );
}

export function validateRedisUrl(url: string, isProduction: boolean): void {
  if (!url) return;
  
  try {
    const parsed = new URL(url);
    // Check if password exists in the URL
    const hasPassword = !!parsed.password;
    
    // In production, we strongly expect auth.
    // If password is not in URL, checks if REDIS_PASSWORD env var is set.
    const hasEnvPassword = !!process.env.REDIS_PASSWORD || !!process.env.NEX_REDIS_PASSWORD;
    
    if (isProduction && !hasPassword && !hasEnvPassword) {
      // Log safety warning - mask creds just in case logic is flawed, but here we know pass is missing.
      logger.warn(`[Redis Config] WARNING: Redis connection string appears to be missing a password in a production environment. Host: ${parsed.hostname}`);
    }
  } catch (err) {
    // Safe logging to help debug format without leaking secrets
    const hasProtocol = url.startsWith('redis://') || url.startsWith('rediss://');
    const hasAtSymbol = url.includes('@');
    logger.error(`[Redis Config] Failed to validate Redis URL format: ${err}. Debug: startsWithProtocol=${hasProtocol}, hasAtSymbol=${hasAtSymbol}, length=${url.length}`);
  }
}


const teardownHandlers = new Set<() => void | Promise<void>>();
let teardownListenersBound = false;

export function registerTeardown(handler: () => void | Promise<void>) {
  if (typeof process === "undefined") {
    return;
  }

  teardownHandlers.add(handler);

  if (teardownListenersBound) {
    return;
  }

  const runHandlers = () => {
    for (const fn of teardownHandlers) {
      try {
        void fn();
      } catch (error) {
        logger.warn("[redis] teardown handler failed", error);
      }
    }
    teardownHandlers.clear();
  };

  process.once("beforeExit", runHandlers);
  process.once("SIGINT", runHandlers);
  process.once("SIGTERM", runHandlers);
  teardownListenersBound = true;
}

export function ensureDualStack(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("family")) {
      parsed.searchParams.set("family", "0");
    }
    return parsed.toString();
  } catch {
    return url.includes("?") ? `${url}&family=0` : `${url}?family=0`;
  }
}
