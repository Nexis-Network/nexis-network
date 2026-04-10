import { redis } from "@/server/services/redis";


import { logger } from '@/lib/logger';
export interface VendorRequestOptions extends RequestInit {
  retry?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

export interface VendorResponse<T> {
  data: T;
  stale?: boolean;
  fetchedAt: Date;
}

const DEFAULT_RETRY = 3;
const DEFAULT_BACKOFF = 1000;
const DEFAULT_TIMEOUT_MS = 10_000;

export class VendorHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: UntypedJson,
    message?: string,
  ) {
    super(message ?? `Vendor request failed with status ${status}`);
  }
}

export class VendorRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VendorRateLimitError";
  }
}

export class VendorTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VendorTimeoutError";
  }
}

export async function vendorFetch<T>(
  url: string,
  options: VendorRequestOptions = {},
): Promise<T> {
  const {
    retry = DEFAULT_RETRY,
    backoffMs = DEFAULT_BACKOFF,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    ...init
  } = options;
  let attempt = 0;

  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const abortExternal = () => {
      controller.abort((externalSignal as AbortSignal)?.reason);
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        externalSignal.addEventListener("abort", abortExternal);
      }
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (response.status === 429) {
        if (attempt > retry) {
          throw new VendorRateLimitError("Vendor rate limit exceeded");
        }
        const retryAfter = Number(response.headers.get("retry-after")) || backoffMs * attempt;
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        continue;
      }

      if (!response.ok) {
        const body = await safeParse(response);
        const isRetryableServerError = response.status >= 500;
        const isClientError = response.status >= 400 && response.status < 500;

        if (isClientError && response.status !== 429) {
          // Propagate client errors immediately so callers can try other fallbacks without waiting
          throw new VendorHttpError(response.status, body);
        }

        if (!isRetryableServerError) {
          throw new VendorHttpError(response.status, body);
        }

        if (attempt > retry) {
          throw new VendorHttpError(response.status, body);
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
        continue;
      }

      return (await safeParse(response)) as T;
    } catch (error) {
      const isAbortError =
        error instanceof DOMException
          ? error.name === "AbortError"
          : error instanceof Error && error.name === "AbortError";
      if (isAbortError) {
        if (attempt > retry) {
          throw new VendorTimeoutError(`Vendor request to ${url} timed out after ${timeoutMs}ms`);
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortExternal);
      }
    }
  }
}

async function safeParse(response: Response): Promise<UntypedJson> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export function vendorCacheKey(parts: Array<string | number | undefined>): string {
  return parts.filter(Boolean).join(":");
}

export async function withVendorCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<VendorResponse<T>> {
  const cached = await redis.get<string>(key);
  if (cached != null) {
    try {
      return {
        data: JSON.parse(cached) as T,
        stale: false,
        fetchedAt: new Date(),
      };
    } catch (error) {
      logger.warn(
        `[withVendorCache] Failed to parse cached payload for key ${key}:`,
        error,
      );
      // Remove the corrupt value so the fetcher can refresh it.
      try {
        await redis.del(key);
      } catch (delError) {
        logger.warn(
          `[withVendorCache] Failed to delete corrupt cache entry for key ${key}:`,
          delError,
        );
      }
    }
  }

  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), {
    ex: ttlSeconds,
  });

  return {
    data,
    stale: false,
    fetchedAt: new Date(),
  };
}
