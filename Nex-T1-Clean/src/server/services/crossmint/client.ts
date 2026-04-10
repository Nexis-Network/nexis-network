import "server-only";

import { logger } from "@/lib/logger";

export type CrossmintEnv = "staging" | "production";

export const CROSSMINT_API_VERSION = "2025-06-09" as const;

const DEFAULT_TIMEOUT_MS = 15_000;

export function resolveCrossmintEnv(raw?: string | null): CrossmintEnv {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (normalized === "production" || normalized === "prod") return "production";
  if (normalized === "staging" || normalized === "stage" || normalized === "test") return "staging";
  return process.env.NODE_ENV === "production" ? "production" : "staging";
}

export function getCrossmintEnv(): CrossmintEnv {
  return resolveCrossmintEnv(process.env.CROSSMINT_ENV ?? process.env.NEXT_PUBLIC_CROSSMINT_ENV);
}

export function getCrossmintBaseUrl(env: CrossmintEnv = getCrossmintEnv()): string {
  return env === "production" ? "https://www.crossmint.com" : "https://staging.crossmint.com";
}

export function getCrossmintApiKey(): string | null {
  const key = process.env.CROSSMINT_API_KEY?.trim() ?? process.env.CROSSMINT_SERVER_API_KEY?.trim() ?? "";
  return key.length > 0 ? key : null;
}

type CrossmintJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  errorText: string | null;
};

async function readResponseText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function buildHeaders(apiKey: string, extra?: HeadersInit): HeadersInit {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": apiKey,
    ...(extra ?? {}),
  };
}

export async function crossmintRequestJson<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit; env?: CrossmintEnv; timeoutMs?: number; apiKey?: string },
): Promise<CrossmintJsonResult<T>> {
  const env = init.env ?? getCrossmintEnv();
  const apiKey = init.apiKey ?? getCrossmintApiKey();
  if (!apiKey) {
    return { ok: false, status: 500, data: null, errorText: "missing_crossmint_api_key" };
  }

  const url = `${getCrossmintBaseUrl(env)}${path.startsWith("/") ? path : `/${path}`}`;
  const timeoutMs = typeof init.timeoutMs === "number" ? init.timeoutMs : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: buildHeaders(apiKey, init.headers),
    });

    const raw = await readResponseText(res);
    const json = (() => {
      try {
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    })();

    return {
      ok: res.ok,
      status: res.status,
      data: json,
      errorText: res.ok ? null : raw || res.statusText || "crossmint_request_failed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("crossmint_request_failed", { path, message });
    return { ok: false, status: 502, data: null, errorText: message };
  } finally {
    clearTimeout(timeout);
  }
}

