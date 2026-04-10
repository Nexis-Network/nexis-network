import "server-only";

import crypto from "crypto";

import { timeVendor } from "@/server/instrumentation/metrics";
import { createLogger } from "@/server/logging/logging";
import { getOrSet } from "@/server/services/redis/cache";

export type MoralisApi = "evm" | "solana";
export type MoralisHttpMethod = "GET" | "POST";

export type MoralisCacheOptions = {
  ttlSeconds: number;
  staleTtlSeconds?: number;
  namespace?: string;
  coalesce?: boolean;
  tags?: string[];
  key?: string;
};

export type MoralisRequestOptions = {
  api: MoralisApi;
  path: string;
  method?: MoralisHttpMethod;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number | boolean>>;
  body?: UntypedJson;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  cache?: MoralisCacheOptions;
};

export type MoralisErrorType = 
  | 'billing' 
  | 'rate_limit' 
  | 'auth' 
  | 'not_found' 
  | 'validation' 
  | 'network' 
  | 'unknown';

export type MoralisErrorMeta = {
  api: MoralisApi;
  url: string;
  status?: number;
  requestId?: string | null;
  retryable?: boolean;
  details?: UntypedJson;
  errorType?: MoralisErrorType;
  isRecoverable?: boolean;
  userMessage?: string;
};

export class MoralisError extends Error {
  meta: MoralisErrorMeta;
  errorType: MoralisErrorType;
  isRecoverable: boolean;
  userMessage: string;

  constructor(message: string, meta: MoralisErrorMeta) {
    super(message);
    this.name = "MoralisError";
    this.meta = meta;
    this.errorType = meta.errorType ?? 'unknown';
    this.isRecoverable = meta.isRecoverable ?? false;
    this.userMessage = meta.userMessage ?? 'An error occurred while fetching wallet data';
  }
}

export class MoralisConfigError extends MoralisError {
  constructor(message: string) {
    super(message, { api: "evm", url: "moralis://config" });
    this.name = "MoralisConfigError";
  }
}

const logger = createLogger("moralis");

const MORALIS_EVM_BASE_URL = "https://deep-index.moralis.io/api/v2.2";
const MORALIS_SOL_BASE_URL = "https://solana-gateway.moralis.io";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 3;
const CACHE_VERSION = "v1";

function getApiKey(): string {
  const raw = process.env.MORALIS_API_KEY?.trim();
  if (!raw) {
    throw new MoralisConfigError("MORALIS_API_KEY is not configured");
  }
  return raw;
}

function resolveBaseUrl(api: MoralisApi): string {
  return api === "evm" ? MORALIS_EVM_BASE_URL : MORALIS_SOL_BASE_URL;
}

function stableJson(value: UntypedJson): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: UntypedJson): UntypedJson {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, UntypedJson>;
    const out: Record<string, UntypedJson> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = sortValue(record[key]);
    }
    return out;
  }
  return value;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function computeCacheKey(opts: MoralisRequestOptions): string {
  if (opts.cache?.key) return opts.cache.key;
  const method = opts.method ?? "GET";
  const query = opts.query ?? {};
  const body = opts.body ?? null;
  const tags = opts.cache?.tags ?? [];

  const fingerprint = sha256(stableJson({ method, query, body, tags }));
  return `moralis:${opts.api}:${CACHE_VERSION}:${method}:${opts.path}:${fingerprint}`;
}

function toUrl(opts: MoralisRequestOptions): URL {
  const base = resolveBaseUrl(opts.api);
  const url = new URL(opts.path.startsWith("/") ? opts.path : `/${opts.path}`, base);

  const entries = Object.entries(opts.query ?? {}).filter(([, value]) => value !== undefined && value !== null);
  entries.sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      const normalized = value
        .filter((item) => item !== undefined && item !== null)
        .map((item) => String(item));
      normalized.sort();
      for (const item of normalized) {
        url.searchParams.append(key, item);
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function computeBackoffMs(attempt: number, baseMs: number): number {
  const exp = Math.min(6, Math.max(0, attempt));
  const backoff = baseMs * 2 ** exp;
  const jitter = Math.floor(Math.random() * baseMs);
  return backoff + jitter;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function classifyMoralisError(
  status: number | undefined, 
  details: UntypedJson
): { errorType: MoralisErrorType; userMessage: string; isRecoverable: boolean } {
  const detailsStr = JSON.stringify(details || {}).toLowerCase();
  
  // Billing issues
  if (detailsStr.includes('invoice') || detailsStr.includes('billing')) {
    return {
      errorType: 'billing',
      userMessage: 'Wallet data temporarily unavailable due to service billing. Please contact support.',
      isRecoverable: false,
    };
  }
  
  // Rate limiting
  if (status === 429) {
    return {
      errorType: 'rate_limit',
      userMessage: 'Too many requests. Please wait a moment and try again.',
      isRecoverable: true,
    };
  }
  
  // Authentication
  if (status === 401 || status === 403) {
    return {
      errorType: 'auth',
      userMessage: 'Service authentication failed. Please contact support.',
      isRecoverable: false,
    };
  }
  
  // Not found
  if (status === 404) {
    return {
      errorType: 'not_found',
      userMessage: 'Wallet data not found for this address.',
      isRecoverable: false,
    };
  }
  
  // Validation
  if (status && status >= 400 && status < 500) {
    return {
      errorType: 'validation',
      userMessage: 'Invalid wallet address or parameters.',
      isRecoverable: false,
    };
  }
  
  // Server errors
  if (status && status >= 500) {
    return {
      errorType: 'network',
      userMessage: 'Service temporarily unavailable. Please try again later.',
      isRecoverable: true,
    };
  }
  
  return {
    errorType: 'unknown',
    userMessage: 'Unable to fetch wallet data. Please try again.',
    isRecoverable: true,
  };
}

async function readJsonOrText(response: Response): Promise<UntypedJson> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as UntypedJson;
  } catch {
    return text;
  }
}

async function requestUncached<T>(opts: MoralisRequestOptions): Promise<T> {
  const apiKey = getApiKey();
  const url = toUrl(opts);
  const method = opts.method ?? "GET";

  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");
  headers.set("X-API-Key", apiKey);

  let body: string | undefined;
  if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Number.isFinite(opts.retries) ? Math.max(0, opts.retries as number) : DEFAULT_RETRIES;
  const maxAttempts = 1 + retries;

  return timeVendor(`moralis_${opts.api}`, async () => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutReason = new DOMException(`Moralis request timed out after ${timeoutMs}ms`, "AbortError");
      const timeout = setTimeout(() => controller.abort(timeoutReason), timeoutMs);

      const abortExternal = () => controller.abort(opts.signal?.reason ?? timeoutReason);
      if (opts.signal) {
        if (opts.signal.aborted) {
          controller.abort(opts.signal.reason ?? timeoutReason);
        } else {
          opts.signal.addEventListener("abort", abortExternal, { once: true });
        }
      }

      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          body,
          signal: controller.signal,
          next: opts.cache ? { revalidate: opts.cache.ttlSeconds, tags: opts.cache.tags ?? [] } : undefined,
        });

        if (response.ok) {
          return (await readJsonOrText(response)) as T;
        }

        const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-moralis-request-id");
        const details = await readJsonOrText(response);

        const retryable = shouldRetry(response.status);
        if (retryable && attempt < maxAttempts - 1) {
          const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
          const delayMs = Math.max(retryAfterMs ?? 0, computeBackoffMs(attempt, 250));
          logger.debug("retrying_upstream", {
            api: opts.api,
            status: response.status,
            attempt: attempt + 1,
            delayMs,
            path: opts.path,
          });
          await sleep(delayMs);
          continue;
        }

        const classification = classifyMoralisError(response.status, details);
        
        throw new MoralisError("Moralis request failed", {
          api: opts.api,
          url: url.toString(),
          status: response.status,
          requestId,
          retryable,
          details,
          errorType: classification.errorType,
          isRecoverable: classification.isRecoverable,
          userMessage: classification.userMessage,
        });
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        if (isAbort) {
          throw new MoralisError("Moralis request aborted", {
            api: opts.api,
            url: url.toString(),
            retryable: false,
            details: { reason: error.message },
          });
        }

        if (attempt < maxAttempts - 1) {
          const delayMs = computeBackoffMs(attempt, 250);
          logger.debugExpectedError("retrying_network_error", error, {
            api: opts.api,
            attempt: attempt + 1,
            delayMs,
            path: opts.path,
          });
          await sleep(delayMs);
          continue;
        }

        if (error instanceof MoralisError) {
          throw error;
        }

        throw new MoralisError("Moralis request failed", {
          api: opts.api,
          url: url.toString(),
          retryable: false,
          details: { message: error instanceof Error ? error.message : String(error) },
        });
      } finally {
        clearTimeout(timeout);
        if (opts.signal) {
          opts.signal.removeEventListener("abort", abortExternal);
        }
      }
    }

    throw new MoralisError("Moralis request failed", { api: opts.api, url: url.toString() });
  });
}

export async function moralisRequest<T>(opts: MoralisRequestOptions): Promise<T> {
  if (!opts.cache) {
    return requestUncached<T>(opts);
  }

  const key = computeCacheKey(opts);
  const namespace = opts.cache.namespace ?? `moralis_${opts.api}`;

  return getOrSet(
    key,
    () => requestUncached<T>(opts),
    {
      ttlSeconds: opts.cache.ttlSeconds,
      staleTtlSeconds: opts.cache.staleTtlSeconds,
      coalesce: opts.cache.coalesce ?? true,
      namespace,
    },
  );
}
