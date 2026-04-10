import "server-only";

import { logger } from "@/lib/logger";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const DEFAULT_TIMEOUT_MS = 10_000;

type BirdeyeResponseEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type BirdeyeFetchOptions = {
  chain?: string;
  version?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function getBirdeyeApiKey(): string {
  return process.env.BIRDEYE_API_KEY?.trim() ?? "";
}

function normalizeVersionedPath(path: string, version?: string): string {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  if (!normalizedPath) {
    throw new Error("Birdeye path is required");
  }

  // If caller already passed a versioned path (`v1/...`, `v2/...`, `defi/v3/...`), keep it as-is.
  if (
    normalizedPath.startsWith("v1/") ||
    normalizedPath.startsWith("v2/") ||
    normalizedPath.startsWith("defi/")
  ) {
    return normalizedPath;
  }

  if (!version) {
    return normalizedPath;
  }

  return `${version.replace(/^\/+|\/+$/g, "")}/${normalizedPath}`;
}

function unwrapBirdeyePayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    return payload as T;
  }

  const record = payload as BirdeyeResponseEnvelope<T>;
  if ("data" in record) {
    if (record.success === false) {
      throw new Error(record.message || record.error || "Birdeye request failed");
    }
    return record.data as T;
  }

  return payload as T;
}

export async function birdeyeFetch<T>(
  path: string,
  options: BirdeyeFetchOptions = {},
): Promise<T> {
  const apiKey = getBirdeyeApiKey();
  if (!apiKey) {
    throw new Error("BIRDEYE_API_KEY is not configured");
  }

  const normalizedPath = normalizeVersionedPath(path, options.version);
  const url = `${BIRDEYE_BASE_URL}/${normalizedPath}`;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Number(options.timeoutMs)) : DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-API-KEY": apiKey,
  };

  if (options.chain?.trim()) {
    headers["x-chain"] = options.chain.trim().toLowerCase();
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      abortController.abort();
    } else {
      options.signal.addEventListener(
        "abort",
        () => {
          abortController.abort();
        },
        { once: true },
      );
    }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: abortController.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(`Birdeye HTTP ${response.status}: ${bodyText || response.statusText}`);
    }

    const payload = (await response.json()) as unknown;
    try {
      return unwrapBirdeyePayload<T>(payload);
    } catch (error) {
      logger.warn("[birdeyeFetch] failed to unwrap payload", {
        path: normalizedPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}
