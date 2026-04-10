"use client";

const CHAT_ERROR_MESSAGE_MAP: Record<string, string> = {
  amount_exceeded:
    "You do not have enough credits for this request. Upgrade your plan or buy more credits.",
  authentication_required: "You need to sign in to use chat.",
  credits_unavailable:
    "Credits are temporarily unavailable. Please retry in a moment.",
  rate_limited: "Chat rate limit exceeded. Please try again in a moment.",
};

function resolveFriendlyChatErrorMessage(
  message: string | null | undefined,
): string | null {
  if (!message) {
    return null;
  }

  const normalizedMessage = message.trim().toLowerCase();
  return CHAT_ERROR_MESSAGE_MAP[normalizedMessage] ?? null;
}

type ChatHttpErrorJson = {
  code?: unknown;
  message?: unknown;
  error?: {
    message?: unknown;
    code?: unknown;
  } | null;
};

export type ChatHttpErrorKind =
  | "api_error"
  | "cloudflare_timeout"
  | "html_error"
  | "payment_required"
  | "unknown";

export type ChatHttpRetryPolicy =
  | {
      policy: "after-delay";
      reason: "rate_limited" | "server_error" | "upstream_timeout";
      afterSeconds: number | null;
    }
  | {
      policy: "retry";
      reason: "server_error";
      afterSeconds: null;
    }
  | {
      policy: "never";
      reason: "client_error" | "insufficient_credits";
      afterSeconds: null;
    };

type ChatHttpErrorMetadataBase = {
  bodySnippet: string | null;
  code: string | null;
  rawMessage: string | null;
  requestId: string | null;
  responseType: "html" | "json" | "text" | "unknown";
  retryAfterSeconds: number | null;
  status: number;
};

export type ChatHttpErrorMetadata =
  | (ChatHttpErrorMetadataBase & {
      kind: "api_error";
      retryable: boolean;
    })
  | (ChatHttpErrorMetadataBase & {
      kind: "cloudflare_timeout";
      retryable: true;
    })
  | (ChatHttpErrorMetadataBase & {
      kind: "html_error";
      retryable: boolean;
    })
  | (ChatHttpErrorMetadataBase & {
      kind: "payment_required";
      retryable: false;
    })
  | (ChatHttpErrorMetadataBase & {
      kind: "unknown";
      retryable: boolean;
    });

function parseRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) {
    return null;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  return Number.isFinite(seconds) ? seconds : null;
}

function parseRequestId(response: Response): string | null {
  const requestId =
    response.headers.get("x-request-id") ?? response.headers.get("cf-ray");
  if (!requestId) {
    return null;
  }

  const trimmed = requestId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getResponseType(
  contentType: string,
  bodyLower: string,
): ChatHttpErrorMetadata["responseType"] {
  if (
    contentType.includes("text/html") ||
    bodyLower.includes("<!doctype html") ||
    bodyLower.includes("<html")
  ) {
    return "html";
  }

  if (contentType.includes("application/json")) {
    return "json";
  }

  if (contentType.trim().length > 0) {
    return "text";
  }

  return "unknown";
}

function parseChatHttpErrorJson(body: string): ChatHttpErrorJson | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as ChatHttpErrorJson;
  } catch {
    return null;
  }
}

export class ChatHttpError extends Error {
  readonly code: string | null;
  readonly kind: ChatHttpErrorKind;
  readonly metadata: ChatHttpErrorMetadata;
  readonly retry: ChatHttpRetryPolicy;
  readonly retryAfterSeconds: number | null;
  readonly status: number;

  constructor(options: {
    message: string;
    metadata: ChatHttpErrorMetadata;
    retry: ChatHttpRetryPolicy;
    status: number;
    code?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(options.message);
    this.name = "ChatHttpError";
    this.kind = options.metadata.kind;
    this.metadata = options.metadata;
    this.retry = options.retry;
    this.status = options.status;
    this.code = options.code ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

function createMetadata(options: {
  body: string;
  code?: string | null;
  kind: ChatHttpErrorKind;
  rawMessage?: string | null;
  response: Response;
  responseType: ChatHttpErrorMetadata["responseType"];
  retryAfterSeconds: number | null;
  retryable: boolean;
}): ChatHttpErrorMetadata {
  const bodySnippet = options.body.trim().slice(0, 180) || null;
  const base = {
    bodySnippet,
    code: options.code ?? null,
    rawMessage: options.rawMessage ?? null,
    requestId: parseRequestId(options.response),
    responseType: options.responseType,
    retryAfterSeconds: options.retryAfterSeconds,
    status: options.response.status,
  };

  switch (options.kind) {
    case "cloudflare_timeout":
      return { ...base, kind: "cloudflare_timeout", retryable: true };
    case "html_error":
      return { ...base, kind: "html_error", retryable: options.retryable };
    case "payment_required":
      return { ...base, kind: "payment_required", retryable: false };
    case "api_error":
      return { ...base, kind: "api_error", retryable: options.retryable };
    default:
      return { ...base, kind: "unknown", retryable: options.retryable };
  }
}

function resolveRetryPolicy(options: {
  code?: string | null;
  kind: ChatHttpErrorKind;
  retryAfterSeconds: number | null;
  status: number;
}): ChatHttpRetryPolicy {
  if (options.code === "rate_limited") {
    return {
      policy: "after-delay",
      reason: "rate_limited",
      afterSeconds: options.retryAfterSeconds,
    };
  }

  if (options.kind === "cloudflare_timeout") {
    return {
      policy: "after-delay",
      reason: "upstream_timeout",
      afterSeconds: options.retryAfterSeconds,
    };
  }

  if (options.kind === "payment_required" || options.status === 402) {
    return {
      policy: "never",
      reason: "insufficient_credits",
      afterSeconds: null,
    };
  }

  if (options.status >= 500) {
    if (options.retryAfterSeconds !== null) {
      return {
        policy: "after-delay",
        reason: "server_error",
        afterSeconds: options.retryAfterSeconds,
      };
    }

    return {
      policy: "retry",
      reason: "server_error",
      afterSeconds: null,
    };
  }

  return {
    policy: "never",
    reason: "client_error",
    afterSeconds: null,
  };
}

export async function createChatHttpError(
  response: Response,
): Promise<ChatHttpError> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const body = await response.text().catch(() => "");
  const bodyLower = body.toLowerCase();
  const retryAfterSeconds = parseRetryAfterSeconds(response);
  const responseType = getResponseType(contentType, bodyLower);

  const isCloudflare524 =
    response.status === 524 ||
    bodyLower.includes("error code 524") ||
    bodyLower.includes("a timeout occurred");

  if (isCloudflare524) {
    const metadata = createMetadata({
      body,
      kind: "cloudflare_timeout",
      response,
      responseType,
      retryAfterSeconds,
      retryable: true,
    });
    return new ChatHttpError({
      message: "The chat service timed out (Cloudflare 524). Please retry in a minute.",
      metadata,
      retry: resolveRetryPolicy({
        kind: metadata.kind,
        retryAfterSeconds,
        status: response.status,
      }),
      status: response.status,
      retryAfterSeconds,
    });
  }

  if (responseType === "html") {
    const metadata = createMetadata({
      body,
      kind: "html_error",
      response,
      responseType,
      retryAfterSeconds,
      retryable: response.status >= 500,
    });
    return new ChatHttpError({
      message: `The chat service returned an unexpected HTML error (HTTP ${response.status}). Please retry shortly.`,
      metadata,
      retry: resolveRetryPolicy({
        kind: metadata.kind,
        retryAfterSeconds,
        status: response.status,
      }),
      status: response.status,
      retryAfterSeconds,
    });
  }

  if (responseType === "json") {
    const parsed = parseChatHttpErrorJson(body);
    if (parsed) {
      const directMessage =
        typeof parsed.message === "string" ? parsed.message : null;
      const nestedMessage =
        parsed.error && typeof parsed.error.message === "string"
          ? parsed.error.message
          : null;
      const code =
        parsed.error && typeof parsed.error.code === "string"
          ? parsed.error.code
          : typeof parsed.code === "string"
            ? parsed.code
            : null;
      const message = directMessage ?? nestedMessage;
      const kind =
        response.status === 402 || code === "amount_exceeded"
          ? "payment_required"
          : "api_error";

      if (message) {
        const metadata = createMetadata({
          body,
          code,
          kind,
          rawMessage: message,
          response,
          responseType,
          retryAfterSeconds,
          retryable: kind !== "payment_required" && (code === "rate_limited" || response.status >= 500),
        });
        return new ChatHttpError({
          message: resolveFriendlyChatErrorMessage(message) ?? message,
          metadata,
          retry: resolveRetryPolicy({
            code,
            kind: metadata.kind,
            retryAfterSeconds,
            status: response.status,
          }),
          status: response.status,
          code,
          retryAfterSeconds,
        });
      }
    }
  }

  if (response.status === 402) {
    const metadata = createMetadata({
      body,
      code: "amount_exceeded",
      kind: "payment_required",
      rawMessage: "amount_exceeded",
      response,
      responseType,
      retryAfterSeconds,
      retryable: false,
    });
    return new ChatHttpError({
      message:
        CHAT_ERROR_MESSAGE_MAP.amount_exceeded ??
        "You do not have enough credits for this request.",
      metadata,
      retry: resolveRetryPolicy({
        code: metadata.code,
        kind: metadata.kind,
        retryAfterSeconds,
        status: response.status,
      }),
      status: response.status,
      code: metadata.code,
      retryAfterSeconds,
    });
  }

  const brief = body.trim().slice(0, 180);
  const metadata = createMetadata({
    body,
    kind: "unknown",
    response,
    responseType,
    retryAfterSeconds,
    retryable: response.status >= 500,
  });
  return new ChatHttpError({
    message: brief
      ? `Chat request failed (HTTP ${response.status}): ${brief}`
      : `Chat request failed (HTTP ${response.status}).`,
    metadata,
    retry: resolveRetryPolicy({
      kind: metadata.kind,
      retryAfterSeconds,
      status: response.status,
    }),
    status: response.status,
    retryAfterSeconds,
  });
}

export async function extractChatHttpErrorMessage(
  response: Response,
): Promise<string> {
  const error = await createChatHttpError(response);
  return error.message;
}
