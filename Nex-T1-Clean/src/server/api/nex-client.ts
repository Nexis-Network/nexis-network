import { isBuildEvaluation } from "@/lib/server/build-evaluation";
import { logger } from '@/lib/logger';

const LOCAL_FALLBACK = "http://localhost:8001";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureProtocol(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function tryNormalizeAbsolute(candidate?: string | null) {
  const normalized = candidate?.trim();
  if (!normalized) {
    return null;
  }
  try {
    return stripTrailingSlash(new URL(normalized).toString());
  } catch {
    return null;
  }
}

function tryResolveFromRelativeBase(relativeBase: string) {
  const trimmed = relativeBase.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const originCandidate =
    process.env.NEX_API_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? ensureProtocol(process.env.VERCEL_URL.trim()) : null);

  if (!originCandidate) {
    return null;
  }

  try {
    return stripTrailingSlash(new URL(trimmed, ensureProtocol(originCandidate)).toString());
  } catch {
    return null;
  }
}

// NEX_API_BASE is now only used for backend API calls, not auth
export const NEX_API_BASE = (() => {
  const explicit = tryNormalizeAbsolute(process.env.NEX_API_BASE);
  if (explicit) {
    return explicit;
  }

  const publicBase = process.env.NEXT_PUBLIC_NEX_API_BASE?.trim();
  if (publicBase) {
    const absolutePublic = tryNormalizeAbsolute(publicBase) ?? tryResolveFromRelativeBase(publicBase);
    if (absolutePublic) {
      if (process.env.NODE_ENV !== "production") {
        logger.info(`[nexFetch] Resolved NEX_API_BASE from NEXT_PUBLIC_NEX_API_BASE -> ${absolutePublic}`);
      }
      return absolutePublic;
    }
  }

  if (process.env.NODE_ENV === "production") {
    if (!isBuildEvaluation()) {
      logger.warn(
        "NEX_API_BASE is not configured. Defaulting to relative URL for build/runtime safety. " +
        "Ensure NEX_API_BASE or NEXT_PUBLIC_NEX_API_BASE is set in production."
      );
    }
    // Fallback to a relative path or localhost to avoid crashing the build
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }

  return LOCAL_FALLBACK;
})();

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function nexFetch(
  path: string,
  opts: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: UntypedJson;
    bearer?: string;
    timeoutMs?: number;
    stream?: boolean;
  } = {}
) {
  const url = `${NEX_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const { method = "GET", headers = {}, body, bearer, timeoutMs = 10_000, stream } = opts;

  const headerKeySet = new Set(Object.keys(headers).map((key) => key.toLowerCase()));

  const isSpecialBodyType = (value: UntypedJson) => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    if (typeof ReadableStream !== "undefined" && value instanceof ReadableStream) {
      return true;
    }
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return true;
    }
    if (typeof FormData !== "undefined" && value instanceof FormData) {
      return true;
    }
    if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
      return true;
    }
    if (typeof Blob !== "undefined" && value instanceof Blob) {
      return true;
    }
    return false;
  };

  const shouldJsonStringify =
    body !== undefined &&
    body !== null &&
    (typeof body === "number" ||
      typeof body === "boolean" ||
      (typeof body === "object" && !isSpecialBodyType(body)));

  const resolvedBody =
    body === undefined || body === null
      ? undefined
      : shouldJsonStringify
        ? JSON.stringify(body)
        : (body as BodyInit);

  const defaultHeaders: Record<string, string> = {
    Accept: stream ? "text/event-stream" : "application/json",
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    "User-Agent": "NexDashboard/1.0" as string,
  };

  if (bearer && !headerKeySet.has("x-supabase-auth")) {
    defaultHeaders["X-Supabase-Auth"] = bearer;
  }

  if (!headers["Content-Type"]) {
    if (stream && (shouldJsonStringify || typeof body === "string")) {
      defaultHeaders["Content-Type"] = "application/json";
    } else if (!stream) {
      defaultHeaders["Content-Type"] = "application/json";
    }
  }

  const controller = new AbortController();
  const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      body: resolvedBody,
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
