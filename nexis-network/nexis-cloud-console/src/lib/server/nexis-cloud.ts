import "server-only";

const DEFAULT_BASE_URL = "https://cloud-api.nexis.network/api/v1";
const DEFAULT_VERSION = "2025-10-28";

export type NexisFetchResult = {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
  headers: Headers;
};

export function getNexisApiBaseUrl() {
  return (
    process.env.NEXIS_CLOUD_API_URL ||
    process.env.PHALA_CLOUD_API_PREFIX ||
    DEFAULT_BASE_URL
  );
}

export function getNexisApiVersion() {
  return process.env.NEXIS_CLOUD_API_VERSION || DEFAULT_VERSION;
}

export async function nexisFetch(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    apiKey?: string | null;
  } = {},
): Promise<NexisFetchResult> {
  const baseUrl = getNexisApiBaseUrl();
  const version = getNexisApiVersion();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const requestHeaders: Record<string, string> = {
    "X-Phala-Version": version,
    ...options.headers,
  };

  if (options.apiKey) {
    requestHeaders["X-API-Key"] = options.apiKey;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (typeof options.body === "string" || options.body instanceof ArrayBuffer) {
      body = options.body as BodyInit;
    } else {
      body = JSON.stringify(options.body);
      if (!requestHeaders["Content-Type"]) {
        requestHeaders["Content-Type"] = "application/json";
      }
    }
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: requestHeaders,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;

  if (response.status !== 204) {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
    headers: response.headers,
  };
}
