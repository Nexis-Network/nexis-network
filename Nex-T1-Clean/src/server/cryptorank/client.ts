import { setTimeout as delay } from "timers/promises";

export type CryptorankClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  defaultQuery?: Record<string, UntypedJson>;
  defaultHeaders?: Record<string, string>;
};

export type CryptorankRequestOptions = {
  path: string;
  query?: Record<string, UntypedJson>;
  signal?: AbortSignal;
};

export type CryptorankSuccessResponse<TData = UntypedJson> = {
  ok: true;
  data: TData;
  raw: UntypedJson;
  usedCredits?: number;
  headers: Record<string, string>;
};

export type CryptorankErrorResponse = {
  ok: false;
  statusCode: number;
  message: string;
  raw: UntypedJson;
  headers: Record<string, string>;
};

export type CryptorankResponse<TData = UntypedJson> =
  | CryptorankSuccessResponse<TData>
  | CryptorankErrorResponse;

const DEFAULT_BASE_URL =
  process.env.CRYPTORANK_API_BASE_URL?.replace(/\/$/, "") || "https://api.cryptorank.io";
const DEFAULT_TIMEOUT_MS = Number(process.env.CRYPTORANK_TIMEOUT_MS ?? 15_000);
const DEFAULT_MAX_RETRIES = Number(process.env.CRYPTORANK_MAX_RETRIES ?? 2);

const sleep = (ms: number) => delay(ms);

const coerceQueryValue = (value: UntypedJson): string | string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

const isStatusObject = (value: UntypedJson): value is { usedCredits?: UntypedJson } =>
  Boolean(value && typeof value === "object" && "usedCredits" in (value as Record<string, UntypedJson>));

export class CryptorankClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly defaultQuery: Record<string, UntypedJson>;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: CryptorankClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.CRYPTORANK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "CRYPTORANK_API_KEY is not configured. Add it to your environment before invoking CryptoRank tools.",
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultQuery = options.defaultQuery ?? {};
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  async request<TData = UntypedJson>({ path, query, signal }: CryptorankRequestOptions): Promise<CryptorankResponse<TData>> {
    const attempts = Math.max(0, this.maxRetries);

    let lastError: UntypedJson;
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.execute<TData>({ path, query, signal });
        return response;
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < attempts && this.isRetriableError(error);
        if (!shouldRetry) {
          throw error;
        }
        await sleep(this.retryDelay(attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async execute<TData>({ path, query, signal }: CryptorankRequestOptions): Promise<CryptorankResponse<TData>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    if (signal) {
      const abortListener = () => controller.abort();
      signal.addEventListener("abort", abortListener, { once: true });
    }

    try {
      const url = this.buildUrl(path, query);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
          ...this.defaultHeaders,
        },
        signal: controller.signal,
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const text = await response.text();
      const raw = text ? parseJsonSafe(text) : null;

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          message: extractErrorMessage(raw) ?? response.statusText,
          raw,
          headers,
        } satisfies CryptorankErrorResponse;
      }

      const payload = raw as Record<string, UntypedJson> | null;
      const data = (payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: TData }).data
        : (payload as TData)) as TData;
      const status = payload && typeof payload === "object" && "status" in payload
        ? (payload as { status?: UntypedJson }).status
        : undefined;

      return {
        ok: true,
        data,
        raw,
        usedCredits: isStatusObject(status) && typeof status.usedCredits === "number" ? status.usedCredits : undefined,
        headers,
      } satisfies CryptorankSuccessResponse<TData>;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          statusCode: 408,
          message: `Cryptorank request timed out after ${this.timeoutMs}ms`,
          raw: null,
          headers: {},
        } satisfies CryptorankErrorResponse;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query: Record<string, UntypedJson> = {}): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);
    const searchParams = url.searchParams;
    const merged = { ...this.defaultQuery, ...query };
    for (const [key, value] of Object.entries(merged)) {
      if (typeof value === "undefined" || value === null) {
        continue;
      }
      const normalized = coerceQueryValue(value);
      if (Array.isArray(normalized)) {
        normalized.forEach((entry) => searchParams.append(key, entry));
      } else {
        searchParams.set(key, normalized);
      }
    }
    return url.toString();
  }

  private retryDelay(attempt: number): number {
    const base = 250 * 2 ** attempt;
    return base + Math.random() * 150;
  }

  private isRetriableError(error: UntypedJson): boolean {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return false;
      }
      const message = error.message.toLowerCase();
      if (message.includes("timeout") || message.includes("network") || message.includes("fetch")) {
        return true;
      }
    }
    return false;
  }
}

const parseJsonSafe = (input: string): UntypedJson => {
  try {
    return JSON.parse(input);
  } catch (error) {
    return { raw: input, parseError: error instanceof Error ? error.message : String(error) };
  }
};

const extractErrorMessage = (payload: UntypedJson): string | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const obj = payload as Record<string, UntypedJson>;
  if (typeof obj.message === "string") {
    return obj.message;
  }
  if (Array.isArray(obj.message)) {
    const first = obj.message[0];
    if (first && typeof first === "object" && typeof (first as { constraints?: Record<string, string> }).constraints === "object") {
      const constraints = (first as { constraints?: Record<string, string> }).constraints ?? {};
      const [, value] = Object.entries(constraints)[0] ?? [];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  }
  if (typeof obj.error === "string") {
    return obj.error;
  }
  return undefined;
};
