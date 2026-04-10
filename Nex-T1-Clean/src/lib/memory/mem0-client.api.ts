import "server-only";

import {
  MEM0_REQUEST_TIMEOUT_MS,
  Mem0ApiError,
  assertMem0Available,
  openMem0Circuit,
} from "./mem0-client.config";

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...(headers as Record<string, string>) };
}

export async function callMem0Api<T = UntypedJson>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const config = assertMem0Available();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${config.baseUrl}${normalizedEndpoint}`;
  const resolvedMethod = (
    options.method ?? (options.body ? "POST" : "GET")
  ).toUpperCase();

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Token ${config.apiKey}`,
  };

  if (config.projectId) {
    baseHeaders["X-Project-ID"] = config.projectId;
  }

  const buildInit = (override?: Partial<RequestInit>): RequestInit => ({
    ...options,
    ...(override ?? {}),
    method: (override?.method ?? resolvedMethod).toString().toUpperCase(),
    cache: options.cache ?? "no-store",
    headers: {
      ...baseHeaders,
      ...toHeaderRecord(options.headers),
      ...toHeaderRecord(override?.headers),
    },
  });

  const execute = async (
    init: RequestInit,
  ): Promise<{ response: Response; method: string }> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MEM0_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      return {
        response,
        method: (init.method ?? resolvedMethod).toString().toUpperCase(),
      };
    } catch (error) {
      const method = (init.method ?? resolvedMethod).toString().toUpperCase();
      if (error instanceof Error && error.name === "AbortError") {
        throw new Mem0ApiError(408, method, normalizedEndpoint, "request_timeout");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const { response, method } = await execute(buildInit());

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      openMem0Circuit(body || `auth_error_${response.status}`, {
        permanent: true,
      });
    }
    throw new Mem0ApiError(response.status, method, endpoint, body);
  }

  return response.json();
}
