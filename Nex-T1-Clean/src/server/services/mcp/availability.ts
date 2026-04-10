type AvailabilityOptions = {
  cacheTtlMs?: number;
  requestTimeoutMs?: number;
  probePath?: string;
};

type AvailabilityCacheEntry = {
  expiresAt: number;
  value: boolean;
};

const availabilityCache = new Map<string, AvailabilityCacheEntry>();
const inflightAvailabilityChecks = new Map<string, Promise<boolean>>();

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 1_500;
const DEFAULT_PROBE_PATH = "/mcp/messages";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function buildAvailabilityCacheKey(
  baseUrl: string,
  probePath: string,
  requestTimeoutMs: number,
): string {
  return `${normalizeBaseUrl(baseUrl)}|${probePath}|${requestTimeoutMs}`;
}

async function probeMcpEndpoint(
  baseUrl: string,
  probePath: string,
  requestTimeoutMs: number,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    await fetch(`${normalizeBaseUrl(baseUrl)}${probePath}`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json, text/event-stream, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "availability-probe",
        method: "ping",
        params: {},
      }),
    });

    // Any resolved HTTP response means the endpoint is reachable enough for runtime use.
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function isMcpEndpointAvailable(
  baseUrl: string,
  options: AvailabilityOptions = {},
): Promise<boolean> {
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const requestTimeoutMs =
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const probePath = options.probePath ?? DEFAULT_PROBE_PATH;
  const cacheKey = buildAvailabilityCacheKey(
    baseUrl,
    probePath,
    requestTimeoutMs,
  );

  const now = Date.now();
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inflight = inflightAvailabilityChecks.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const checkPromise = probeMcpEndpoint(
    baseUrl,
    probePath,
    requestTimeoutMs,
  ).then((value) => {
    availabilityCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + cacheTtlMs,
    });
    inflightAvailabilityChecks.delete(cacheKey);
    return value;
  });

  inflightAvailabilityChecks.set(cacheKey, checkPromise);
  return checkPromise;
}

export function clearMcpAvailabilityCache(): void {
  availabilityCache.clear();
  inflightAvailabilityChecks.clear();
}
